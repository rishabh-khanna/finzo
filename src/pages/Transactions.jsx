import { useState } from 'react'
import { useStore, useTransactions } from '../lib/useStore.js'
import { fmt, CATS } from '../lib/format.js'
import { Chip, EmptyState } from '../components/Atoms.jsx'

export default function Transactions() {
  const { state } = useStore()
  const { filtered } = useTransactions()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const rows = filtered.filter(t => {
    const q = search.toLowerCase()
    const match = !q || t.merchant?.toLowerCase().includes(q) || (t.upi_id||'').includes(q) || t.description?.toLowerCase().includes(q)
    if (!match) return false
    if (filter === 'cc')      return t.account_type === 'credit_card' || t.source === 'cc_statement'
    if (filter === 'upi')     return t.source === 'upi_email' || t.account_type === 'debit_card'
    if (filter === 'anomaly') return t.anomaly
    if (filter === 'credit')  return t.type === 'credit'
    return true
  })

  const cur = state.currency

  return (
    <div className="page">
      <div style={{ background:'rgba(91,156,246,0.08)', border:'1px solid rgba(91,156,246,0.25)', borderRadius:10, padding:'9px 14px', marginBottom:12, fontSize:11, color:'var(--blue)', fontWeight:600 }}>
        📧 Showing transactions from bank statements AND UPI/CC alert emails · {filtered.filter(t=>t.source?.includes('email')||t.source?.includes('alert')).length} from alerts
      </div>

      <div style={{ position:'relative', marginBottom:10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchants, UPI IDs..." className="input" style={{ paddingLeft:36 }} />
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, pointerEvents:'none' }}>🔍</span>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
        {[['all','All'],['cc','💳 CC'],['upi','📱 UPI/Debit'],['anomaly','⚠️ Anomaly'],['credit','Credits']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ flexShrink:0, padding:'7px 13px', borderRadius:20, border:'1px solid var(--border)', background: filter===k ? 'var(--accent)' : 'var(--card)', color: filter===k ? '#fff' : 'var(--sub)', fontWeight:600, fontSize:12, cursor:'pointer' }}>{l}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="📭" title="No transactions yet" sub="Import a bank statement or paste email alerts to get started" />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {rows.map(t => (
            <div key={t.id} style={{ background:'var(--card)', border:`1px solid ${t.anomaly ? 'rgba(255,92,92,0.35)' : 'var(--border)'}`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${CATS[t.category]?.c || '#78909C'}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {CATS[t.category]?.i || '📌'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{t.merchant || t.description}</span>
                  {t.anomaly && <Chip label="⚠️ ANOMALY" color="var(--danger)" small />}
                  <Chip label={t.account_type === 'credit_card' ? '💳 CC' : '📱 UPI/Debit'} color={t.account_type === 'credit_card' ? 'var(--accent)' : 'var(--success)'} small />
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{t.date} · {t.upi_id || t.bank || 'Bank Transfer'}</div>
                <div style={{ marginTop:5 }}><Chip label={CATS[t.category]?.l || t.category} color={CATS[t.category]?.c || '#78909C'} small /></div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color: t.type === 'credit' ? 'var(--success)' : 'var(--text)' }}>
                  {t.type === 'credit' ? '+' : '−'}{fmt(t.amount, cur)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop:10, fontSize:10, color:'var(--muted)', textAlign:'right' }}>{rows.length} transactions</div>
    </div>
  )
}