export default function Investments() {
  return (
    <div className="page" style={{textAlign:'center', paddingTop:48}}>
      <div style={{fontSize:48, marginBottom:16}}>📈</div>
      <div style={{fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:8}}>{'Investments'}</div>
      <div style={{fontSize:13, color:'var(--sub)', maxWidth:360, margin:'0 auto', lineHeight:1.7}}>{'Upload your mutual fund CAS report or broker statement PDF to track your portfolio here.'}</div>
    </div>
  )
}