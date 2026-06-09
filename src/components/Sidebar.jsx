import { useStore } from '../lib/useStore.jsx'

const NAV = [
  { group:'💸 Spending',     items:[
    { id:'dashboard',     label:'Dashboard',     icon:'📊' },
    { id:'transactions',  label:'Transactions',  icon:'📋' },
    { id:'categories',    label:'Categories',    icon:'🗂️' },
    { id:'recurring',     label:'Recurring',     icon:'🔁' },
    { id:'budgets',       label:'Budgets (AI)',  icon:'🎯' },
    { id:'subscriptions', label:'Subscriptions', icon:'📱' },
  ]},
  { group:'📈 Investments',  items:[
    { id:'investments',   label:'Investments',   icon:'📈' },
    { id:'networth',      label:'Net Worth',     icon:'🏦' },
  ]},
  { group:'🤖 AI',           items:[
    { id:'ai_advisor',    label:'AI Advisor',    icon:'🤖' },
  ]},
  { group:'⚙️ Account',      items:[
    { id:'settings',      label:'Settings',      icon:'⚙️' },
  ]},
]

export default function Sidebar({ page, setPage, open, mini, onToggle, isMobile, onLogout }) {
  const { state, actions } = useStore()
  const w = open ? 230 : mini ? 64 : 0

  return (
    <>
      {isMobile && open && (
        <div onClick={onToggle} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:150, backdropFilter:'blur(3px)' }} />
      )}
      <aside style={{
        position: isMobile ? 'fixed' : 'relative',
        top:0, left:0, zIndex:200, height:'100dvh',
        width:w, flexShrink:0,
        background:'var(--surface)', borderRight: w ? '1px solid var(--border)' : 'none',
        display:'flex', flexDirection:'column', overflow:'hidden',
        transition:'width 0.26s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Header */}
        <div style={{ height:56, flexShrink:0, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent: open ? 'space-between' : 'center', padding: open ? '0 14px' : '0 8px', gap:8 }}>
          {open && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:14, fontFamily:'Georgia,serif' }}>F</div>
              <span style={{ fontSize:17, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px' }}>finzo</span>
            </div>
          )}
          {!open && mini && (
            <div style={{ width:26, height:26, borderRadius:7, background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:14 }}>F</div>
          )}
          <button onClick={onToggle} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--sub)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
            {open ? '‹' : mini ? '✕' : '›'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'8px 7px', overflowY:'auto', overflowX:'hidden' }}>
          {NAV.map(group => (
            <div key={group.group} style={{ marginBottom:6 }}>
              {open && <div style={{ fontSize:9, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.09em', padding:'4px 11px 5px' }}>{group.group}</div>}
              {!open && mini && <div style={{ height:1, background:'var(--border)', margin:'5px 8px' }} />}
              {group.items.map(n => {
                const active = page === n.id
                return (
                  <button key={n.id} onClick={() => { setPage(n.id); if(isMobile) onToggle() }} title={n.label} style={{
                    display:'flex', alignItems:'center', justifyContent: open ? 'flex-start' : 'center',
                    gap:10, width:'100%', marginBottom:1,
                    padding: open ? '9px 11px' : '9px 0',
                    borderRadius:9, border:'none', cursor:'pointer',
                    background: active ? 'rgba(124,111,255,0.12)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--sub)',
                    fontWeight: active ? 700 : 500, fontSize:13,
                    position:'relative', transition:'background 0.15s, color 0.15s',
                    whiteSpace:'nowrap',
                  }}>
                    {mini && active && <span style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:20, background:'var(--accent)', borderRadius:'0 3px 3px 0' }} />}
                    <span style={{ fontSize:15, width:20, textAlign:'center', flexShrink:0 }}>{n.icon}</span>
                    {open && <span style={{ flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis' }}>{n.label}</span>}
                    {open && active && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:'8px 7px 14px', borderTop:'1px solid var(--border)', flexShrink:0, display:'flex', flexDirection:'column', gap:5 }}>
          <button onClick={actions.toggleTheme} style={{ display:'flex', alignItems:'center', justifyContent: open ? 'flex-start' : 'center', gap:10, padding: open ? '8px 11px' : '8px 0', borderRadius:9, border:'none', background:'transparent', color:'var(--sub)', cursor:'pointer', fontSize:13, fontWeight:500, width:'100%', whiteSpace:'nowrap' }}>
            <span style={{ fontSize:15, width:20, textAlign:'center' }}>{state.theme === 'dark' ? '☀️' : '🌙'}</span>
            {open && <span>{state.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {open ? (
            <select value={state.currency} onChange={e => actions.setCurrency(e.target.value)} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 9px', color:'var(--text)', fontSize:12, fontWeight:700, cursor:'pointer', outline:'none', width:'100%' }}>
              {[['INR','₹ INR'],['USD','$ USD'],['GBP','£ GBP'],['EUR','€ EUR']].map(([k,l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          ) : mini ? (
            <div style={{ textAlign:'center', fontWeight:900, color:'var(--accent)', fontSize:14, padding:'4px 0' }}>
              {state.currency === 'INR' ? '₹' : state.currency === 'USD' ? '$' : state.currency === 'GBP' ? '£' : '€'}
            </div>
          ) : null}

          {open && (
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:9, background:'var(--tag)', marginTop:2 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff', fontWeight:800, flexShrink:0 }}>
                {(state.user?.user_metadata?.name || state.user?.email || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{state.user?.user_metadata?.name || state.user?.email?.split('@')[0] || 'User'}</div>
                <div style={{ fontSize:10, color:'var(--muted)' }}>{state.user?.email || ''}</div>
              </div>
              <button onClick={onLogout} title="Logout" style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--sub)', padding:2, flexShrink:0 }}>⏻</button>
            </div>
          )}
          {mini && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff', fontWeight:800, cursor:'pointer' }}>
                {(state.user?.user_metadata?.name || state.user?.email || 'U')[0].toUpperCase()}
              </div>
              <button onClick={onLogout} title="Logout" style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--sub)' }}>⏻</button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}