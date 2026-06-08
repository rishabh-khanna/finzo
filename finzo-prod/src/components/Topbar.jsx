const LABELS = {
  dashboard:'Dashboard', transactions:'Transactions', categories:'Categories',
  recurring:'Recurring & Frequent', budgets:'Budgets (AI)', subscriptions:'Subscriptions',
  investments:'Investments', networth:'Net Worth', ai_advisor:'AI Advisor',
  import:'Import Data', settings:'Settings',
}

export default function Topbar({ page, setPage, sideOpen, sideMini, onHamburger }) {
  const showHamburger = !sideOpen
  return (
    <header style={{ height:56, flexShrink:0, borderBottom:'1px solid var(--border)', background:'var(--bg)', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {showHamburger && (
          <button onClick={onHamburger} className="btn-icon btn">☰</button>
        )}
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', letterSpacing:'-0.3px' }}>{LABELS[page] || page}</div>
          <div style={{ fontSize:10, color:'var(--muted)' }}>May 2026</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button onClick={() => setPage('ai_advisor')} style={{ background:'rgba(124,111,255,0.1)', border:'1px solid rgba(124,111,255,0.3)', borderRadius:8, padding:'5px 11px', fontSize:11, color:'var(--accent)', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>✦ AI</button>
        <button onClick={() => setPage('import')} className="btn btn-primary" style={{ padding:'7px 16px', fontSize:12 }}>+ Import</button>
      </div>
    </header>
  )
}