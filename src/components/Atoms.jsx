// Shared micro-components used across all pages

export function Chip({ label, color, small }) {
  return (
    <span style={{ background:`${color}18`, color, border:`1px solid ${color}30`, borderRadius:20, padding: small ? '1px 7px' : '2px 9px', fontSize: small ? 9 : 10, fontWeight:700, whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', lineHeight:1.6 }}>
      {label}
    </span>
  )
}

export function ProgBar({ pct, color, h = 7 }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:100, height:h, overflow:'hidden' }}>
      <div style={{ height:'100%', borderRadius:100, background:color, width:`${Math.min(Math.max(Number(pct)||0,0),100)}%`, transition:'width 0.6s ease' }} />
    </div>
  )
}

export function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="card" style={{ padding:'14px 15px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <span style={{ fontSize:10, color:'var(--sub)', fontWeight:600 }}>{label}</span>
        <span style={{ fontSize:20 }}>{icon}</span>
      </div>
      <div style={{ fontSize:22, fontWeight:900, color: color || 'var(--text)', letterSpacing:'-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'var(--sub)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

export function Section({ title, children, action, onAction, style = {} }) {
  return (
    <div className="card" style={{ marginBottom:14, ...style }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{title}</div>
        {action && <button onClick={onAction} style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>{action}</button>}
      </div>
      {children}
    </div>
  )
}

export function AiBanner({ title, text, action, onAction }) {
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(124,111,255,0.09),rgba(255,107,157,0.05))', border:'1px solid rgba(124,111,255,0.2)', borderRadius:12, padding:'13px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
      <div style={{ width:28, height:28, borderRadius:7, background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>✦</div>
      <div style={{ flex:1, minWidth:180 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{title}</div>
        <div style={{ fontSize:11, color:'var(--sub)', lineHeight:1.65 }}>{text}</div>
      </div>
      {action && <button onClick={onAction} style={{ background:'var(--accent)', border:'none', color:'#fff', borderRadius:8, padding:'7px 13px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{action}</button>}
    </div>
  )
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--sub)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12 }}>{sub}</div>
    </div>
  )
}