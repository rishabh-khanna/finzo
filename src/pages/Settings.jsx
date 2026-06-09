import { useStore } from '../lib/useStore.jsx'

export default function Settings({ onLogout }) {
  const { state, actions } = useStore()
  const userName = state.user?.user_metadata?.name || state.user?.email?.split('@')[0] || 'User'
  const userEmail = state.user?.email || ''

  return (
    <div className="page">
      {/* Profile card */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', fontWeight:800, flexShrink:0 }}>
            {userName[0].toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{userName}</div>
            <div style={{ fontSize:12, color:'var(--sub)' }}>{userEmail}</div>
            <div style={{ fontSize:11, color:'var(--success)', marginTop:3 }}>✓ Logged in · Data stored privately</div>
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
          <button onClick={actions.toggleTheme} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:700, color:'var(--text)', cursor:'pointer' }}>
            {state.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0' }}>
          <div style={{ fontSize:13, color:'var(--text)', fontWeight:600 }}>Currency</div>
          <div style={{ display:'flex', gap:8 }}>
            {['INR','USD','GBP','EUR'].map(c => (
              <button key={c} onClick={() => actions.setCurrency(c)} style={{
                padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)',
                background: state.currency === c ? 'var(--accent)' : 'var(--surface)',
                color: state.currency === c ? '#fff' : 'var(--sub)',
                fontWeight:700, fontSize:12, cursor:'pointer',
              }}>{c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'GBP' ? '£' : '€'} {c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:12 }}>📧 Email & Data Sources</div>
        <div style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Gmail Integration</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Auto-fetch statements + UPI alerts</div>
            </div>
            <span style={{ background:'rgba(255,175,32,0.15)', color:'var(--warn)', borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700 }}>Coming Soon</span>
          </div>
        </div>
        <div style={{ padding:'10px 0' }}>
          <div style={{ fontSize:12, color:'var(--sub)', lineHeight:1.7 }}>
            Currently supported: Upload PDF statements directly, or paste UPI/CC alert email text in Import page.
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>🔒 Privacy & Data</div>
        <div style={{ fontSize:12, color:'var(--sub)', lineHeight:1.85 }}>
          ✓ PDF parsing happens in your browser — no statement ever leaves your device<br/>
          ✓ Transaction data stored in your private Supabase database<br/>
          ✓ Row-level security — no one can see your data<br/>
          ✓ No data sold or shared with third parties<br/>
          ✓ Export or delete all your data anytime
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
