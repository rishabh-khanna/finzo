import { useState, useRef, useEffect } from 'react'
import { useStore } from '../lib/useStore.jsx'
import { processPDF, detectBank, BANK_PASSWORD_PATTERNS } from '../lib/pdfParser.js'
import { gmailAPI } from '../lib/api.js'
import { transactions as txnDB, statements as stmtDB } from '../lib/db.js'
import { AiBanner } from '../components/Atoms.jsx'

export default function Import({ onDone }) {
  const { state, actions } = useStore()
  const userId = state.user?.id

  // Gmail state
  const [gmailStatus, setGmailStatus]   = useState(null)  // null | { connected, email }
  const [gmailLoading, setGmailLoading] = useState(false)
  const [scanResults, setScanResults]   = useState(null)   // { statements, alerts }
  const [scanning, setScanning]         = useState(false)
  const [selected, setSelected]         = useState([])
  const [processing, setProcessing]     = useState(false)
  const [procStep, setProcStep]         = useState('')
  const [procPct, setProcPct]           = useState(0)
  const [done, setDone]                 = useState(null)

  // PDF upload state
  const [tab, setTab]           = useState('gmail')
  const [file, setFile]         = useState(null)
  const [bank, setBank]         = useState('')
  const [password, setPassword] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState('')
  const fileRef = useRef()

  // Check Gmail connection on mount + handle OAuth callback
  useEffect(() => {
    if (!userId) return

    // Check if returning from OAuth
    const params = new URLSearchParams(window.location.search)
    const gmailResult = params.get('gmail')
    const gmailEmail  = params.get('email')

    if (gmailResult === 'connected') {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      setGmailStatus({ connected: true, email: decodeURIComponent(gmailEmail || '') })
      // Auto-start scan
      doScan({ connected: true })
    } else if (gmailResult === 'denied') {
      window.history.replaceState({}, '', window.location.pathname)
      setError('Gmail access was denied. Please try again.')
    } else {
      // Check existing connection
      checkGmailStatus()
    }
  }, [userId])

  const checkGmailStatus = async () => {
    if (!userId) return
    try {
      const status = await gmailAPI.status(userId)
      setGmailStatus(status)
    } catch {
      setGmailStatus({ connected: false })
    }
  }

  const connectGmail = async () => {
    if (!userId) return
    setGmailLoading(true)
    setError('')
    try {
      const { authUrl } = await gmailAPI.startOAuth(userId)
      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (err) {
      setError('Could not start Gmail connection. Check backend URL in settings.')
      setGmailLoading(false)
    }
  }

  const doScan = async (status = gmailStatus) => {
    if (!status?.connected || !userId) return
    setScanning(true)
    setError('')
    setScanResults(null)
    try {
      const result = await gmailAPI.scan(userId)
      setScanResults(result)
      // Auto-select all statements
      setSelected(result.statements.map((_, i) => `stmt-${i}`))
    } catch (err) {
      setError(err.message.includes('NOT_CONNECTED')
        ? 'Gmail disconnected. Please reconnect.'
        : `Scan failed: ${err.message}`)
    } finally {
      setScanning(false)
    }
  }

  const toggleSelect = (key) => {
    setSelected(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key])
  }

  const importSelected = async () => {
    if (!scanResults || selected.length === 0) return
    setProcessing(true)
    setError('')

    let totalImported = 0

    try {
      // Import selected PDF statements
      for (let i = 0; i < scanResults.statements.length; i++) {
        const stmt = scanResults.statements[i]
        const key  = `stmt-${i}`
        if (!selected.includes(key)) continue

        setProcStep(`Downloading ${stmt.attachments[0]?.filename || 'statement'}...`)
        setProcPct(Math.round((i / scanResults.statements.length) * 40))

        try {
          // Download PDF from Gmail via backend
          const { data: base64, filename } = await gmailAPI.downloadAttachment(
            userId,
            stmt.messageId,
            stmt.attachments[0].attachmentId,
            stmt.attachments[0].filename
          )

          // Convert base64 to File object for PDF.js
          const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const pdfFile  = new File([pdfBytes], filename || 'statement.pdf', { type: 'application/pdf' })

          setProcStep(`Parsing ${filename}...`)
          setProcPct(Math.round(40 + (i / scanResults.statements.length) * 30))

          // Parse PDF in browser using PDF.js
          const { processPDF: parsePDF } = await import('../lib/pdfParser.js')
          const { transactions: txns, meta } = await parsePDF(pdfFile, '', (msg, pct) => {
            setProcStep(msg)
          })

          // Save to Supabase
          setProcStep(`Saving ${txns.length} transactions...`)
          const stmtRecord = await stmtDB.create({ ...meta, filename })
          await txnDB.bulkCreate(txns.map(t => ({
            ...t,
            statement_id: stmtRecord?.id,
            month: new Date(t.date).getMonth() + 1,
            year:  new Date(t.date).getFullYear(),
          })))
          actions.addTransactions(txns)
          totalImported += txns.length

        } catch (stmtErr) {
          console.error(`Error processing statement ${i}:`, stmtErr)
        }
      }

      // Import selected alert emails
      const selectedAlerts = scanResults.alerts.filter((_, i) => selected.includes(`alert-${i}`))
      if (selectedAlerts.length > 0) {
        setProcStep(`Parsing ${selectedAlerts.length} transaction alert emails...`)
        setProcPct(75)

        const { transactions: alertTxns } = await gmailAPI.parseAlerts(userId, selectedAlerts)
        if (alertTxns?.length) {
          await txnDB.bulkCreate(alertTxns)
          actions.addTransactions(alertTxns)
          totalImported += alertTxns.length
        }
      }

      setProcPct(100)
      setProcStep('Done!')
      setDone({ count: totalImported })

    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  // ── PDF UPLOAD FLOW ─────────────────────────────────────────
  const onFileChange = (f) => {
    if (!f) return
    setFile(f)
    const detected = detectBank(f.name)
    setBank(detected)
    setError('')
  }

  const analyzePDF = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      const { transactions: txns, meta } = await processPDF(file, password, (msg, pct) => {
        setProcStep(msg); setProcPct(pct)
      })
      try {
        const stmt = await stmtDB.create({ ...meta, filename: file.name })
        await txnDB.bulkCreate(txns.map(t => ({
          ...t,
          statement_id: stmt?.id,
          month: new Date(t.date).getMonth() + 1,
          year:  new Date(t.date).getFullYear(),
        })))
      } catch { /* DB might not be connected */ }
      actions.addTransactions(txns)
      setDone({ count: txns.length })
    } catch (err) {
      setError(err.message.includes('password')
        ? 'Incorrect password. Please check and try again.'
        : err.message)
    } finally {
      setProcessing(false)
    }
  }

  // ── DONE SCREEN ─────────────────────────────────────────────
  if (done) return (
    <div className="page" style={{ textAlign:'center', paddingTop:48 }}>
      <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
      <div style={{ fontSize:22, fontWeight:900, color:'var(--text)', marginBottom:8 }}>Import Complete!</div>
      <div style={{ fontSize:14, color:'var(--sub)', marginBottom:28 }}>
        {done.count} transactions imported successfully
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
        <button onClick={() => { setDone(null); setFile(null); setPassword(''); setScanResults(null); setSelected([]) }}
          className="btn btn-ghost">Import More</button>
        <button onClick={onDone} className="btn btn-primary">View Dashboard →</button>
      </div>
    </div>
  )

  // ── PROCESSING SCREEN ────────────────────────────────────────
  if (processing) return (
    <div className="page" style={{ maxWidth:480 }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
        <div style={{ fontSize:22, fontWeight:900, color:'var(--text)', marginBottom:4 }}>Analyzing...</div>
        <div style={{ fontSize:12, color:'var(--sub)' }}>PDF parsing happens in your browser — private</div>
      </div>
      <div style={{ background:'var(--border)', borderRadius:100, height:10, marginBottom:8 }}>
        <div style={{ height:'100%', borderRadius:100, background:'var(--gradient)', width:`${procPct}%`, transition:'width 0.3s' }}/>
      </div>
      <div style={{ fontSize:12, color:'var(--accent)', fontWeight:700, textAlign:'center', marginBottom:20 }}>
        {Math.round(procPct)}% — {procStep}
      </div>
    </div>
  )

  return (
    <div className="page" style={{ maxWidth:600 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:900, color:'var(--text)', letterSpacing:'-0.5px' }}>Import Financial Data</div>
        <div style={{ fontSize:12, color:'var(--sub)', marginTop:4 }}>Connect Gmail to auto-fetch all bank statements and transaction alerts</div>
      </div>

      {/* Tab selector */}
      <div style={{ display:'flex', background:'var(--surface)', borderRadius:10, padding:3, marginBottom:16, width:'fit-content' }}>
        {[['gmail','📧 Gmail (Recommended)'],['pdf','📄 Upload PDF'],['email','✉️ Paste Email']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:12, background: tab===k ? 'var(--accent)' : 'transparent', color: tab===k ? '#fff' : 'var(--sub)' }}>{l}</button>
        ))}
      </div>

      {error && (
        <div style={{ background:'rgba(255,92,92,0.1)', border:'1px solid rgba(255,92,92,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'var(--danger)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── GMAIL TAB ── */}
      {tab === 'gmail' && (<>
        {/* Not connected */}
        {(!gmailStatus || !gmailStatus.connected) && (
          <>
            <AiBanner
              title="Connect Gmail — Fetch Everything Automatically"
              text="Finzo will scan your inbox and find ALL bank statement PDFs AND every UPI/CC transaction alert email from HDFC, SBI, ICICI, Axis, Kotak and more. Read-only access — your emails are never stored."
            />
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:24, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:'rgba(124,111,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>📧</div>
                <div>
                  <div style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>Connect Your Gmail</div>
                  <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>Secure OAuth 2.0 · Read-only · Revocable anytime</div>
                </div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {['📄 PDF Statements','📱 UPI Alerts','💳 CC Alerts','🏦 All Banks'].map(f => (
                  <div key={f} style={{ background:'rgba(124,111,255,0.1)', border:'1px solid rgba(124,111,255,0.2)', borderRadius:8, padding:'4px 12px', fontSize:11, color:'var(--accent)', fontWeight:600 }}>{f}</div>
                ))}
              </div>
              <button onClick={connectGmail} disabled={gmailLoading} style={{
                width:'100%', padding:'13px', borderRadius:11,
                background: gmailLoading ? 'var(--muted)' : 'var(--gradient)',
                border:'none', color:'#fff', fontWeight:800, fontSize:15, cursor: gmailLoading ? 'wait' : 'pointer',
                boxShadow: gmailLoading ? 'none' : '0 6px 24px rgba(124,111,255,0.35)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.2 13 17.7 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/>
                  <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/>
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.5-4.9 2.4-8.4 2.4-6.3 0-11.7-4.3-13.6-10l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
                </svg>
                {gmailLoading ? 'Connecting...' : 'Connect Gmail Account'}
              </button>
            </div>
          </>
        )}

        {/* Connected — show scan */}
        {gmailStatus?.connected && (<>
          <div style={{ background:'rgba(0,212,143,0.08)', border:'1px solid rgba(0,212,143,0.25)', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontSize:20 }}>✅</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--success)' }}>Gmail Connected</div>
              <div style={{ fontSize:11, color:'var(--sub)' }}>{gmailStatus.email}</div>
            </div>
            <button onClick={() => doScan()} disabled={scanning} style={{ background:'var(--gradient)', border:'none', color:'#fff', borderRadius:9, padding:'8px 18px', fontWeight:700, fontSize:13, cursor: scanning ? 'wait' : 'pointer' }}>
              {scanning ? '🔍 Scanning...' : '🔍 Scan Inbox'}
            </button>
            <button onClick={async () => { await gmailAPI.disconnect(userId); setGmailStatus({ connected:false }); setScanResults(null) }}
              style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', borderRadius:9, padding:'8px 14px', fontWeight:600, fontSize:12, cursor:'pointer' }}>
              Disconnect
            </button>
          </div>

          {/* Scanning spinner */}
          {scanning && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:40, marginBottom:12, animation:'spin 1s linear infinite', display:'inline-block' }}>🔍</div>
              <div style={{ fontSize:14, color:'var(--sub)' }}>Scanning inbox for bank emails...</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Scan results */}
          {scanResults && !scanning && (<>
            <div style={{ background:'rgba(0,212,143,0.07)', border:'1px solid rgba(0,212,143,0.22)', borderRadius:11, padding:'10px 16px', marginBottom:14, fontSize:13, color:'var(--success)', fontWeight:600 }}>
              ✓ Found {scanResults.statements.length} PDF statements + {scanResults.alerts.length} transaction alerts
            </div>

            {/* PDF Statements */}
            {scanResults.statements.length > 0 && (<>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>📄 Bank Statements</div>
              {scanResults.statements.map((stmt, i) => (
                <div key={i} onClick={() => toggleSelect(`stmt-${i}`)} style={{
                  background: selected.includes(`stmt-${i}`) ? 'rgba(124,111,255,0.07)' : 'var(--card)',
                  border:`1px solid ${selected.includes(`stmt-${i}`) ? 'rgba(124,111,255,0.4)' : 'var(--border)'}`,
                  borderRadius:12, padding:'13px 14px', marginBottom:10, cursor:'pointer',
                }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div onClick={e => { e.stopPropagation(); toggleSelect(`stmt-${i}`) }} style={{
                      width:20, height:20, borderRadius:5, flexShrink:0, marginTop:2, cursor:'pointer',
                      background: selected.includes(`stmt-${i}`) ? 'var(--accent)' : 'transparent',
                      border:`2px solid ${selected.includes(`stmt-${i}`) ? 'var(--accent)' : 'var(--border)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff',
                    }}>{selected.includes(`stmt-${i}`) ? '✓' : ''}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:4 }}>
                        <span style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>
                          {stmt.bank !== 'unknown' ? stmt.bank.toUpperCase() : 'Bank'} Statement
                        </span>
                        <span style={{ fontSize:10, color:'var(--muted)' }}>{stmt.date?.slice(0,20)} · {stmt.sizeKB}KB</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--sub)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stmt.subject}</div>
                      {stmt.attachments[0] && (
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>
                          📎 {stmt.attachments[0].filename} · {stmt.attachments[0].size}
                        </div>
                      )}
                      <div style={{ marginTop:8 }}>
                        {BANK_PASSWORD_PATTERNS[stmt.bank] ? (
                          <span style={{ background:'rgba(0,212,143,0.08)', border:'1px solid rgba(0,212,143,0.22)', borderRadius:7, padding:'2px 9px', fontSize:10, color:'var(--success)', fontWeight:700 }}>
                            🔐 Auto-unlock: {BANK_PASSWORD_PATTERNS[stmt.bank].label}
                          </span>
                        ) : (
                          <span style={{ background:'rgba(255,175,32,0.1)', border:'1px solid rgba(255,175,32,0.3)', borderRadius:7, padding:'2px 9px', fontSize:10, color:'var(--warn)', fontWeight:700 }}>
                            🔑 May need password
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>)}

            {/* Alert emails */}
            {scanResults.alerts.length > 0 && (<>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'14px 0 10px' }}>📱 Transaction Alert Emails</div>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'13px 14px', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input type="checkbox" checked={scanResults.alerts.every((_,i) => selected.includes(`alert-${i}`))}
                    onChange={e => {
                      if (e.target.checked) setSelected(s => [...s, ...scanResults.alerts.map((_,i) => `alert-${i}`).filter(k => !s.includes(k))])
                      else setSelected(s => s.filter(k => !k.startsWith('alert-')))
                    }}
                    style={{ width:16, height:16, cursor:'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                      Import all {scanResults.alerts.length} transaction alerts
                    </div>
                    <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>
                      UPI debits, CC swipes, bank credits — parsed into individual transactions
                    </div>
                  </div>
                </div>
              </div>
            </>)}

            {/* Import button */}
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={() => {
                const allStmt  = scanResults.statements.map((_,i) => `stmt-${i}`)
                const allAlert = scanResults.alerts.map((_,i) => `alert-${i}`)
                setSelected([...allStmt, ...allAlert])
              }} className="btn btn-ghost" style={{ flex:1 }}>Select All</button>
              <button onClick={importSelected} disabled={selected.length === 0} style={{
                flex:2, padding:'12px', borderRadius:11,
                background: selected.length === 0 ? 'var(--muted)' : 'var(--gradient)',
                border:'none', color:'#fff', fontWeight:800, fontSize:14,
                cursor: selected.length === 0 ? 'default' : 'pointer',
                boxShadow: selected.length > 0 ? '0 6px 22px rgba(124,111,255,0.35)' : 'none',
              }}>
                Import {selected.length} Item{selected.length !== 1 ? 's' : ''} →
              </button>
            </div>
          </>)}
        </>)}
      </>)}

      {/* ── PDF UPLOAD TAB ── */}
      {tab === 'pdf' && (<>
        {!file ? (<>
          <AiBanner title="Supported Banks" text="HDFC, SBI, ICICI, Axis, Kotak, IndusInd, Yes Bank, BOB, Canara, PNB — auto-password detection for most." />
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); onFileChange(e.dataTransfer.files[0]) }}
            style={{ background: dragOver ? 'rgba(124,111,255,0.06)' : 'var(--card)', border:`2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius:14, padding:'28px 22px', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}
          >
            <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e => onFileChange(e.target.files[0])} />
            <div style={{ fontSize:32, marginBottom:10 }}>📁</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Tap to Upload PDF Statement</div>
            <div style={{ fontSize:11, color:'var(--sub)', marginTop:5 }}>Credit card · Debit card · Password-protected PDFs supported</div>
          </div>
        </>) : (<>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:13, padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:11, background:'rgba(124,111,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📄</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{file.name}</div>
                <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>
                  {bank !== 'unknown' ? `Detected: ${bank.toUpperCase()} Bank` : 'Bank not auto-detected'}
                </div>
                {bank !== 'unknown' && BANK_PASSWORD_PATTERNS[bank] && (
                  <div style={{ marginTop:6, display:'inline-block', background:'rgba(0,212,143,0.08)', border:'1px solid rgba(0,212,143,0.22)', borderRadius:7, padding:'2px 9px', fontSize:10, color:'var(--success)', fontWeight:700 }}>
                    🔐 Auto-unlock pattern: {BANK_PASSWORD_PATTERNS[bank].label}
                  </div>
                )}
              </div>
            </div>
            <label style={{ display:'block', fontSize:11, color:'var(--sub)', fontWeight:600, marginBottom:6 }}>
              PDF Password {bank !== 'unknown' && BANK_PASSWORD_PATTERNS[bank] ? `(e.g. ${BANK_PASSWORD_PATTERNS[bank].example})` : '(leave blank if none)'}
            </label>
            <input type="password" className="input" placeholder="Enter password or leave blank"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzePDF()} />
            {error && <div style={{ color:'var(--danger)', fontSize:12, marginTop:8 }}>{error}</div>}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setFile(null); setPassword(''); setError('') }} className="btn btn-ghost" style={{ flex:1 }}>← Back</button>
            <button onClick={analyzePDF} className="btn btn-primary" style={{ flex:2, padding:'13px', fontSize:14 }}>Analyze Statement →</button>
          </div>
        </>)}
      </>)}

      {/* ── PASTE EMAIL TAB ── */}
      {tab === 'email' && (<>
        <AiBanner title="Paste Transaction Alert Emails" text="Copy the text of any bank alert email and paste here. Works with HDFC, SBI, ICICI, Axis and all major Indian banks." />
        <textarea
          placeholder={`Paste email text here. Example:\n\nHDFC Bank: Rs.485.00 debited from A/c XX1234 on 22-05-2026. Info: UPI/swiggy@icici\n\nPaste multiple emails — one per paragraph.`}
          style={{ width:'100%', minHeight:180, padding:'12px 14px', borderRadius:11, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:12, lineHeight:1.6, outline:'none', resize:'vertical', boxSizing:'border-box' }}
          id="emailText"
        />
        {error && <div style={{ color:'var(--danger)', fontSize:12, marginTop:8 }}>{error}</div>}
        <button onClick={async () => {
          const text = document.getElementById('emailText').value.trim()
          if (!text) return
          setProcessing(true)
          try {
            const { parseEmails } = await import('../lib/emailParser.js')
            const txns = parseEmails([{ body: text, sender: '' }])
            if (!txns.length) { setError('No transaction found. Paste the full email text.'); return }
            actions.addTransactions(txns)
            setDone({ count: txns.length })
          } finally { setProcessing(false) }
        }} className="btn btn-primary" style={{ width:'100%', marginTop:12, padding:'13px', fontSize:14 }}>
          Parse Email Transactions →
        </button>
      </>)}
    </div>
  )
}
