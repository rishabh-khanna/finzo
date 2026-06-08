import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { useStore, useTransactions } from '../lib/useStore.js'
import { fmt, CATS } from '../lib/format.js'
import { StatCard, Section, Chip, ProgBar, AiBanner } from '../components/Atoms.jsx'

const MONTHLY = [
  { m:'Jan', spent:28000, income:85000 }, { m:'Feb', spent:31500, income:85000 },
  { m:'Mar', spent:38000, income:85000 }, { m:'Apr', spent:24000, income:85000 },
  { m:'May', spent:38056, income:85000 },
]

export default function Dashboard({ setPage }) {
  const { state } = useStore()
  const cur = state.currency
  const { totalSpent, totalIncome, byCategory, anomalies, ccTxns, debitTxns } = useTransactions()

  const pieData = Object.entries(byCategory)
    .filter(([k]) => k !== 'income')
    .map(([key, value]) => ({ key, name: CATS[key]?.l || key, value }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 8)

  const TT = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, padding:'7px 13px' }}><div style={{ fontSize:10, color:'var(--sub)' }}>{label}</div><div style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>{fmt(payload[0].value, cur)}</div></div>
  }

  return (
    <div className="page">
      {/* CC vs Debit banner */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:140, background:'rgba(124,111,255,0.08)', border:'1px solid rgba(124,111,255,0.25)', borderRadius:11, padding:'10px 14px' }}>
          <div style={{ fontSize:10, color:'var(--sub)', fontWeight:600, marginBottom:4 }}>💳 Credit Card Spends</div>
          <div style={{ fontSize:20, fontWeight:900, color:'var(--accent)' }}>{fmt(ccTxns.filter(t=>t.type==='debit').reduce((s,t)=>s+(t.amount||0),0), cur)}</div>
          <div style={{ fontSize:10, color:'var(--sub)', marginTop:2 }}>{ccTxns.filter(t=>t.type==='debit').length} transactions</div>
        </div>
        <div style={{ flex:1, minWidth:140, background:'rgba(0,212,143,0.08)', border:'1px solid rgba(0,212,143,0.25)', borderRadius:11, padding:'10px 14px' }}>
          <div style={{ fontSize:10, color:'var(--sub)', fontWeight:600, marginBottom:4 }}>📱 UPI / Debit Card</div>
          <div style={{ fontSize:20, fontWeight:900, color:'var(--success)' }}>{fmt(debitTxns.filter(t=>t.type==='debit').reduce((s,t)=>s+(t.amount||0),0), cur)}</div>
          <div style={{ fontSize:10, color:'var(--sub)', marginTop:2 }}>{debitTxns.filter(t=>t.type==='debit').length} transactions</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:14 }}>
        <StatCard label="Total Spent"    value={fmt(totalSpent, cur)}  sub="+18% vs Apr"   color="var(--accent)"  icon="💸" />
        <StatCard label="Monthly Income" value={fmt(totalIncome || 85000, cur)} sub="Salary" color="var(--success)" icon="💰" />
        <StatCard label="Largest Spend"  value={fmt(Math.max(...Object.values(byCategory), 0), cur)} sub="EMI/Loans" color="#EC407A" icon="🏦" />
        <StatCard label="Savings Rate"   value={`${Math.round(((85000-totalSpent)/85000)*100)}%`} sub="of income saved" color="var(--yellow)" icon="🎯" />
      </div>

      {/* Anomaly */}
      {anomalies.length > 0 && (
        <div style={{ background:'rgba(255,92,92,0.07)', border:'1px solid rgba(255,92,92,0.28)', borderRadius:12, padding:'12px 16px', marginBottom:14, display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--danger)', marginBottom:2 }}>Suspicious Transaction Detected</div>
            <div style={{ fontSize:11, color:'var(--sub)' }}>{anomalies[0].merchant} · {anomalies[0].anomalyReason || 'Unusual transaction pattern'}</div>
          </div>
          <button onClick={() => setPage('transactions')} style={{ background:'var(--danger)', border:'none', color:'#fff', borderRadius:8, padding:'7px 14px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>Review →</button>
        </div>
      )}

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12, marginBottom:14 }}>
        <Section title="Spending Breakdown">
          {pieData.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--sub)', fontSize:12 }}>Import a statement to see breakdown</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {pieData.map(c => <Cell key={c.key} fill={CATS[c.key]?.c || '#78909C'} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v, cur)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'3px 10px', marginTop:6 }}>
                {pieData.slice(0,5).map(c => (
                  <div key={c.key} style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:6, height:6, borderRadius:2, background:CATS[c.key]?.c, flexShrink:0 }} />
                    <span style={{ fontSize:9, color:'var(--sub)' }}>{c.name}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:'var(--text)' }}>{fmt(c.value, cur)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        <Section title="Income vs Spending (6mo)">
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={MONTHLY} barSize={12} barGap={3}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="m" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<TT />} />
              <Bar dataKey="income" fill="var(--success)" radius={[4,4,0,0]} opacity={0.4} />
              <Bar dataKey="spent"  fill="var(--accent)"  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* AI quick panel */}
      <Section title="✦ Finzo AI — Suggestions" action="Full report →" onAction={() => setPage('ai_advisor')}>
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {[
            { icon:'💰', color:'#00D48F', t:'Maximize Savings', d:'Based on your spending, you can save ₹14,000+ per year with 3 simple changes.' },
            { icon:'📈', color:'var(--accent)', t:'Investment Tip', d:'Your SIP amount is healthy. Consider increasing by ₹1,000/month when possible.' },
            { icon:'🎯', color:'var(--yellow)', t:'Budget on Track', d:'Most categories within AI-set limits. Check the Budgets page for details.' },
          ].map((ins, i) => (
            <div key={i} style={{ background:'var(--bg)', border:`1px solid var(--border)`, borderRadius:10, padding:'11px 13px', display:'flex', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:`${ins.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{ins.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{ins.t}</div>
                <div style={{ fontSize:11, color:'var(--sub)', lineHeight:1.55 }}>{ins.d}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}