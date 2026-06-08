export default function Budgets() {
  return (
    <div className="page" style={{textAlign:'center', paddingTop:48}}>
      <div style={{fontSize:48, marginBottom:16}}>🎯</div>
      <div style={{fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:8}}>{'AI Budgets'}</div>
      <div style={{fontSize:13, color:'var(--sub)', maxWidth:360, margin:'0 auto', lineHeight:1.7}}>{'AI sets budgets based on your 5-month spending history after import. You can edit any limit.'}</div>
    </div>
  )
}