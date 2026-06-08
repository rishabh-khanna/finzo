import { useState, useRef } from 'react'
import { useStore } from '../lib/useStore.js'
import { processPDF, detectBank, BANK_PASSWORD_PATTERNS } from '../lib/pdfParser.js'
import { parseEmails } from '../lib/emailParser.js'
import { transactions as txnDB, statements as stmtDB } from '../lib/db.js'
import { AiBanner } from '../components/Atoms.jsx'

export default function Import({ onDone }) {
  const { actions } = useStore()
  const [step, setStep]         = useState('choose')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [file, setFile]         = useState(null)
  const [bank, setBank]         = useState('')
  const [password, setPassword] = useState('')
  const [autoPass, setAutoPass] = useState(false)
  const [emailText, setEmailText] = useState('')
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [tab, setTab]           = useState('pdf')
  const fileRef = useRef()

  const onFileChange = (f) => {
    if (!f) return
    setFile(f)
    const detectedBank = detectBank(f.name)
    setBank(detectedBank)
    setAutoPass(detectedBank !== 'unknown')
    setStep('password')
  }

  const onAnalyze = async () => {
    setStep('processing')
    setError('')
    try {
      const onProgress = (msg, pct) => { setProgressMsg(msg); setProgress(pct) }
      const { transactions: txns, meta } = await processPDF(file, password, onProgress)

      // Save statement metadata
      let stmtId = null
      try {
        const stmt = await stmtDB.create({ ...meta, filename: file.name })
        stmtId = stmt.id
        // Add month/year to each txn
        const withMeta = txns.map(t => {
          const d = new Date(t.date)
          return { ...t, month: d.getMonth()+1, year: d.getFullYear(), statement: stmtId }
        })
        await txnDB.bulkCreate(withMeta, stmtId)
        actions.addTransactions(withMeta)
      } catch (dbErr) {
        // If DB fails (not connected), still show results in memory
        actions.addTransactions(txns)
      }

      setResult(meta)
      setStep('done')
    } catch (err) {
      setError(err?.message?.includes('password') ? 'Incorrect password. Please check and try again.' : `Error: ${err.message}`)
      setStep('password')
    }
  }

  const onEmailImport = async () => {
    if (!emailText.trim()) return
    const lines = emailText.split('\n').filter(l => l.trim())
    const emails = lines.map(body => ({ body, sender: '' }))
    const txns = parseEmails(emails)
    if (txns.length === 0) {
      setError('No transaction found. Paste the full email text including amount and merchant.')
      return
    }
    actions.addTransactions(txns)
    setResult({ txnCount: txns.length })
    setStep('done')
  }

  const PROC_STEPS = [
    { l:'Decrypting PDF...', t:15 }, { l:'Detecting bank format...', t:28 },
    { l:'Extracting transactions...', t:50 }, { l:'Cleaning merchant names...', t:65 },
    { l:'AI categorization...', t:78 }, { l:'Anomaly detection...', t:90 },
    { l:'Saving to database...', t:96 },
  ]

  return (
    <div className="page" style={{ maxWidth:560 }}>

      {step === 'choose' && (
        <>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:20, fontWeight:900, color:'var(--text)', letterSpacing:'-0.5px' }}>Import Financial Data</div>
            <div style={{ fontSize:12, color:'var(--sub)', marginTop:4 }}>Upload PDF statements or paste transaction alert emails</div>
          </div>

          {/* Tab selector */}
          <div style={{ display:'flex', background:'var(--surface)', borderRadius:10, padding:3, marginBottom:16, width:'fit-content' }}>
            {[['pdf','📄 PDF Statement'],['email','📧 Email Alerts']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:12, background: tab===k ? 'var(--accent)' : 'transparent', color: tab===k ? '#fff' : 'var(--sub)' }}>{l}</button>
            ))}
          </div>

          {tab === 'pdf' && (
            <>
              <AiBanner
                title="Supported Banks"
                text="HDFC, SBI, ICICI, Axis, Kotak, IndusInd, Yes Bank, BOB, Canara, PNB — auto-password detection for most banks."
              />
              <div
                onClick={() => fileRef.current.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); onFileChange(e.dataTransfer.files[0]) }}
                style={{ background:'var(--card)', border:'2px dashed var(--border)', borderRadius:14, padding:'28px 22px', cursor:'pointer', textAlign:'center', marginBottom:14, transition:'border-color 0.2s' }}
              >
                <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e => onFileChange(e.target.files[0])} />
                <div style={{ fontSize:32, marginBottom:10 }}>📁</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Tap to Upload PDF Statement</div>
                <div style={{ fontSize:11, color:'var(--sub)', marginTop:5 }}>Credit card statements · Debit card statements · Supports password-protected PDFs</div>
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.7 }}>
                💡 <strong style={{ color:'var(--text)' }}>CC vs Debit:</strong> Credit card PDFs are automatically tagged as CC spends. Debit card PDFs and UPI emails are tagged separately. No double counting.
              </div>
            </>
          )}

          {tab === 'email' && (
            <>
              <AiBanner title="Paste UPI / CC Alert Emails" text="Paste the text of any bank transaction alert email. Works with HDFC, SBI, ICICI, Axis and most Indian banks. Handles UPI debits, CC swipes, and credit alerts." />
              <textarea
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
                placeholder={`Paste email text here. Example:\n\nHDFC Bank: Rs.485.00 debited from A/c XX1234 on 22-05-2026. Info: UPI/swiggy@icici\n\n--- Paste multiple emails separated by blank lines ---`}
                style={{ width:'100%', minHeight:180, padding:'12px 14px', borderRadius:11, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:12, lineHeight:1.6, outline:'none', resize:'vertical', boxSizing:'border-box' }}
              />
              {error && <div style={{ color:'var(--danger)', fontSize:12, marginTop:8 }}>{error}</div>}
              <button onClick={onEmailImport} className="btn btn-primary" style={{ width:'100%', marginTop:12, padding:'13px', fontSize:14 }}>
                Parse Email Transactions →
              </button>
            </>
          )}
        </>
      )}

      {step === 'password' && file && (
        <>
          <div style={{ marginBottom:20 }}>
            <button onClick={() => setStep('choose')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', color:'var(--sub)', cursor:'pointer', fontSize:12, fontWeight:600, marginBottom:14 }}>← Back</button>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>Unlock Statement</div>
            <div style={{ fontSize:12, color:'var(--sub)', marginTop:4 }}>{file.name}</div>
          </div>

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:13, padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:11, background:'rgba(124,111,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📄</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{file.name}</div>
                <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>
                  {bank !== 'unknown' ? `Detected: ${bank.toUpperCase()} Bank` : 'Bank not detected from filename'}
                </div>
                {autoPass && bank !== 'unknown' && (
                  <div style={{ marginTop:6, background:'rgba(0,212,143,0.08)', border:'1px solid rgba(0,212,143,0.22)', borderRadius:7, padding:'3px 9px', display:'inline-block', fontSize:10, color:'var(--success)', fontWeight:700 }}>
                    🔐 Pattern: {BANK_PASSWORD_PATTERNS[bank]?.label}
                  </div>
                )}
              </div>
            </div>

            <label style={{ display:'block', fontSize:11, color:'var(--sub)', fontWeight:600, marginBottom:6 }}>
              PDF Password {autoPass ? `(try: ${BANK_PASSWORD_PATTERNS[bank]?.example})` : ''}
            </label>
            <input
              type="password"
              className="input"
              placeholder={autoPass ? `e.g. ${BANK_PASSWORD_PATTERNS[bank]?.example}` : 'Enter PDF password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAnalyze()}
            />
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:6 }}>
              Leave blank if PDF is not password protected
            </div>

            {error && <div style={{ color:'var(--danger)', fontSize:12, marginTop:10, fontWeight:600 }}>{error}</div>}
          </div>

          <button onClick={onAnalyze} className="btn btn-primary" style={{ width:'100%', padding:'13px', fontSize:15 }}>
            Analyze Statement →
          </button>
        </>
      )}

      {step === 'processing' && (
        <div style={{ paddingTop:28 }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--text)', letterSpacing:'-0.5px', marginBottom:4 }}>Analyzing...</div>
            <div style={{ fontSize:11, color:'var(--sub)' }}>PDF parsing in your browser — nothing sent to any server</div>
          </div>
          <div style={{ background:'var(--border)', borderRadius:100, height:10, marginBottom:6 }}>
            <div style={{ height:'100%', borderRadius:100, background:'var(--gradient)', width:`${progress}%`, transition:'width 0.22s' }} />
          </div>
          <div style={{ fontSize:12, color:'var(--accent)', fontWeight:700, textAlign:'center', marginBottom:24 }}>{Math.round(progress)}% — {progressMsg}</div>
          {PROC_STEPS.map((s, i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)', opacity: progress >= s.t ? 1 : progress >= s.t-14 ? 0.5 : 0.18, transition:'opacity 0.35s' }}>
              <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, background: progress >= s.t ? 'rgba(0,212,143,0.15)' : 'rgba(124,111,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color: progress >= s.t ? 'var(--success)' : 'var(--accent)' }}>
                {progress >= s.t ? '✓' : '·'}
              </div>
              <div style={{ fontSize:12, color: progress >= s.t ? 'var(--success)' : 'var(--text)', fontWeight: progress >= s.t ? 600 : 400 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {step === 'done' && result && (
        <div style={{ textAlign:'center', paddingTop:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:24, fontWeight:900, color:'var(--text)', marginBottom:8 }}>Import Complete!</div>
          <div style={{ fontSize:13, color:'var(--sub)', marginBottom:28, lineHeight:1.7 }}>
            {result.txnCount} transactions imported
            {result.bank && result.bank !== 'unknown' ? ` from ${result.bank.toUpperCase()}` : ''}
            {result.accountType === 'credit_card' ? ' (Credit Card)' : result.accountType === 'debit_card' ? ' (Debit Card)' : ''}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => { setStep('choose'); setFile(null); setPassword(''); setError(''); setEmailText('') }} className="btn btn-ghost">Import Another</button>
            <button onClick={onDone} className="btn btn-primary">View Dashboard →</button>
          </div>
        </div>
      )}
    </div>
  )
}