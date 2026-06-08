export default function Categories() {
  return (
    <div className="page" style={{textAlign:'center', paddingTop:48}}>
      <div style={{fontSize:48, marginBottom:16}}>🗂️</div>
      <div style={{fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:8}}>{'Categories'}</div>
      <div style={{fontSize:13, color:'var(--sub)', maxWidth:360, margin:'0 auto', lineHeight:1.7}}>{'Import a statement to see your spending broken down by category with month-over-month charts.'}</div>
    </div>
  )
}