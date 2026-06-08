import { useState, useRef, useEffect, useCallback } from 'react'

const AI = {
  food:'🍔 You spent more than average on food this month. Swiggy and Zomato are your top merchants. Try cooking 3x/week — saves ~₹5,400/year.',
  subscriptions:'📱 Check your subscriptions — you may have inactive ones still charging. Review and cancel unused services.',
  anomaly:'⚠️ Any transaction at odd hours from unknown merchants should be flagged. Contact your bank immediately to dispute suspicious charges.',
  save:'💡 Top savings: cancel unused subscriptions, reduce food delivery by 50%, set grocery weekly limits. Small changes = big annual savings.',
  invest:'📈 Keep SIPs consistent — compounding works best over time. Review underperforming funds quarterly. Increase SIP when income grows.',
  budget:'🎯 AI budgets are based on your 5-month average + buffer. Override any limit in the Budgets page anytime.',
  tax:'📋 Use ELSS funds for 80C deduction (up to ₹1.5L/year). Health insurance premium saves under 80D. File returns early.',
  default:'👋 Hi! I\'m Finzo AI. Ask me: food · subscriptions · anomaly · save · invest · budget · tax',
}

export default function AIChat() {
  const [open, setOpen]   = useState(false)
  const [msgs, setMsgs]   = useState([{ r:'ai', t:AI.default }])
  const [inp, setInp]     = useState('')
  const [typing, setTyping] = useState(false)
  const ref = useRef()

  useEffect(() => { ref.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, typing])

  const send = useCallback((q) => {
    const txt = (q || inp).toLowerCase().trim()
    if (!txt) return
    setMsgs(m => [...m, { r:'user', t: q || inp }])
    setInp(''); setTyping(true)
    setTimeout(() => {
      const key = Object.keys(AI).find(k => txt.includes(k)) || 'default'
      setMsgs(m => [...m, { r:'ai', t: AI[key] }])
      setTyping(false)
    }, 750)
  }, [inp])

  const QUICK = ['food','save','invest','budget','tax','anomaly']

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={{ position:'fixed', bottom:20, right:20, zIndex:900, width:50, height:50, borderRadius:'50%', border:'none', cursor:'pointer', background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, color:'#fff', boxShadow:'0 6px 28px rgba(124,111,255,0.52)', transition:'transform 0.22s ease', transform: open ? 'rotate(45deg)' : 'none' }}>
        {open ? '✕' : '✦'}
      </button>

      {open && (
        <div style={{ position:'fixed', bottom:80, right:20, zIndex:900, width:Math.min(320, window.innerWidth - 32), background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'0 24px 72px rgba(0,0,0,0.48)', display:'flex', flexDirection:'column', maxHeight:'65dvh' }}>
          <div style={{ padding:'11px 15px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'linear-gradient(135deg,rgba(124,111,255,0.09),rgba(255,107,157,0.05))', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>✦</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Finzo AI</div>
              <div style={{ fontSize:10, color:'var(--sub)' }}>Spending · Investments · Tax</div>
            </div>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--success)' }} />
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'12px 13px', display:'flex', flexDirection:'column', gap:8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.r === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth:'85%', padding:'8px 12px', fontSize:12, lineHeight:1.6, borderRadius:12, background: m.r === 'user' ? 'linear-gradient(135deg,#7C6FFF,#9088FF)' : 'var(--card)', color: m.r === 'user' ? '#fff' : 'var(--text)', border: m.r === 'ai' ? '1px solid var(--border)' : 'none', borderBottomRightRadius: m.r === 'user' ? 3 : 12, borderBottomLeftRadius: m.r === 'ai' ? 3 : 12 }}>{m.t}</div>
              </div>
            ))}
            {typing && (
              <div style={{ display:'flex', gap:4, padding:'9px 12px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, borderBottomLeftRadius:3, width:'fit-content' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:`bnc 0.9s ${i*0.15}s infinite` }} />)}
              </div>
            )}
            <div ref={ref} />
          </div>

          <div style={{ padding:'6px 12px', display:'flex', gap:5, overflowX:'auto', scrollbarWidth:'none', flexShrink:0 }}>
            {QUICK.map(q => <button key={q} onClick={() => send(q)} style={{ flexShrink:0, padding:'3px 10px', borderRadius:20, border:'1px solid var(--border)', background:'var(--tag)', color:'var(--sub)', fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>{q}</button>)}
          </div>

          <div style={{ padding:'8px 12px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:7, flexShrink:0 }}>
            <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about your finances..." className="input" style={{ flex:1, fontSize:12 }} />
            <button onClick={() => send()} style={{ width:34, height:34, borderRadius:9, border:'none', background:'var(--gradient)', color:'#fff', fontSize:14, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>→</button>
          </div>
        </div>
      )}
      <style>{`@keyframes bnc{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </>
  )
}