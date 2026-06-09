import { useStore } from '../lib/useStore.jsx'

export default function Settings({ onLogout }) {
  const { state, actions } = useStore()

  return (
    <div className="page">
      {/* Profile card */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'#fff', fontWeight:800, flexShrink:0 }}>
            {state.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{state.user?.name || 'User'}</div>
            <div style={{ fontSize:12, color:'var(--sub)' }}>{state.user?.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:'100%', padding:11, borderRadius:10, background:'rgba(255,92,92,0.1)', border:'1px solid rgba(255,92,92,0.3)', color:'var(--danger)', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          ⏻ Logout from Finzo
        </button>
      </div>

      {/* Appearance */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:14 }}>Appearance</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:13, color:'var(--text)', fontWeight:600 }}>Theme</div>
          <button onClick={actions.toggleTheme} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:700, color:'var(--text)', cursor:'pointer' }}>
            {state.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0' }}>
          <div style={{ fontSize:13, color:'var(--text)', fontWeight:600 }}>Currency</div>
          <select value={state.currency} onChange={e => actions.setCurrency(e.target.value)} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 10px', color:'var(--text)', fontSize:13, fontWeight:700, cursor:'pointer', outline:'none' }}>
            {[['INR','₹ INR'],['USD','$ USD'],['GBP','£ GBP'],['EUR','€ EUR']].map(([k,l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Privacy */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>🔒 Privacy & Data</div>
        <div style={{ fontSize:12, color:'var(--sub)', lineHeight:1.7 }}>
          ✓ PDF parsing happens in your browser — no statement ever leaves your device<br/>
          ✓ Transaction data stored in your private PocketBase database<br/>
          ✓ No data sold or shared with third parties<br/>
          ✓ You can delete all your data at any time
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ border:'1px solid rgba(255,92,92,0.3)' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--danger)', marginBottom:12 }}>Danger Zone</div>
        <button style={{ width:'100%', padding:11, borderRadius:10, background:'rgba(255,92,92,0.1)', border:'1px solid rgba(255,92,92,0.3)', color:'var(--danger)', fontWeight:600, fontSize:13, cursor:'pointer', marginBottom:8 }}>
          Delete All Transactions
        </button>
        <button onClick={onLogout} style={{ width:'100%', padding:11, borderRadius:10, background:'rgba(255,92,92,0.15)', border:'1px solid rgba(255,92,92,0.4)', color:'var(--danger)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          Delete Account & All Data
        </button>
      </div>
    </div>
  )
}