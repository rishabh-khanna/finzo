export default function Subscriptions() {
  return (
    <div className="page" style={{textAlign:'center', paddingTop:48}}>
      <div style={{fontSize:48, marginBottom:16}}>📱</div>
      <div style={{fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:8}}>{'Subscriptions'}</div>
      <div style={{fontSize:13, color:'var(--sub)', maxWidth:360, margin:'0 auto', lineHeight:1.7}}>{'Finzo will detect subscription charges and flag inactive ones after import.'}</div>
    </div>
  )
}