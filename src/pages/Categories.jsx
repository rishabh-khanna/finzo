import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { useStore, useTransactions } from '../lib/useStore.jsx'
import { fmt, CATS, MONTHS } from '../lib/format.js'
import { Chip, EmptyState, Section } from '../components/Atoms.jsx'

export default function Categories() {
  const { state } = useStore()
  const cur = state.currency
  const { filtered: allTxns } = useTransactions()

  // All transactions across all time (not just selected month)
  const allDebits = state.transactions.filter(t => t.type === 'debit')

  // Year/month drill down state
  const [selYear,  setSelYear]  = useState(null)
  const [selMonth, setSelMonth] = useState(null)
  const [selCat,   setSelCat]   = useState(null)

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const years = [...new Set(allDebits.map(t => t.year).filter(Boolean))].sort((a,b) => b-a)
    return years
  }, [allDebits])

  // If no year selected, default to most recent
  const activeYear  = selYear  || availableYears[0] || new Date().getFullYear()
  const activeMonth = selMonth // null = full year view

  // Filter transactions for selected period
  const periodTxns = useMemo(() => {
    return allDebits.filter(t => {
      if (t.year !== activeYear) return false
      if (activeMonth && t.month !== activeMonth) return false
      return true
    })
  }, [allDebits, activeYear, activeMonth])

  // Category totals for period
  const catTotals = useMemo(() => {
    const totals = {}
    for (const t of periodTxns) {
      totals[t.category] = (totals[t.category] || 0) + (t.amount || 0)
    }
    return Object.entries(totals)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a,b) => b.total - a.total)
  }, [periodTxns])

  // Monthly breakdown for selected year (and optionally category)
  const monthlyData = useMemo(() => {
    return MONTHS.map((m, i) => {
      const month = i + 1
      const txns  = allDebits.filter(t =>
        t.year === activeYear &&
        t.month === month &&
        (!selCat || t.category === selCat)
      )
      return {
        m,
        v: txns.reduce((s,t) => s+(t.amount||0), 0),
        count: txns.length,
      }
    })
  }, [allDebits, activeYear, selCat])

  // Transactions for selected category + period
  const catTxns = useMemo(() => {
    if (!selCat) return []
    return periodTxns
      .filter(t => t.category === selCat)
      .sort((a,b) => new Date(b.date) - new Date(a.date))
  }, [periodTxns, selCat])

  const TT = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, padding:'7px 13px' }}>
        <div style={{ fontSize:10, color:'var(--sub)' }}>{label}</div>
        <div style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>{fmt(payload[0].value, cur)}</div>
        {payload[0]?.payload?.count > 0 && <div style={{ fontSize:10, color:'var(--sub)' }}>{payload[0].payload.count} transactions</div>}
      </div>
    )
  }

  if (allDebits.length === 0) {
    return <EmptyState icon="🗂️" title="Categories" sub="Import a statement to see your spending broken down by category with year and month drill-down." />
  }

  return (
    <div className="page">
      {/* Year selector */}
      <div style={{ display:'flex', gap:8, marginBottom:14, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'var(--sub)', fontWeight:600, whiteSpace:'nowrap' }}>Year:</span>
        {availableYears.map(y => (
          <button key={y} onClick={() => { setSelYear(y); setSelMonth(null) }} style={{
            flexShrink:0, padding:'6px 14px', borderRadius:20,
            border:`1px solid ${activeYear===y ? 'var(--accent)' : 'var(--border)'}`,
            background: activeYear===y ? 'var(--accent)' : 'var(--card)',
            color: activeYear===y ? '#fff' : 'var(--sub)',
            fontWeight:700, fontSize:12, cursor:'pointer',
          }}>{y}</button>
        ))}
      </div>

      {/* Month selector */}
      <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none', alignItems:'center' }}>
        <button onClick={() => setSelMonth(null)} style={{
          flexShrink:0, padding:'5px 12px', borderRadius:20,
          border:`1px solid ${!activeMonth ? 'var(--accent)' : 'var(--border)'}`,
          background: !activeMonth ? 'var(--accent)' : 'var(--card)',
          color: !activeMonth ? '#fff' : 'var(--sub)',
          fontWeight:600, fontSize:11, cursor:'pointer',
        }}>Full Year</button>
        {MONTHS.map((m, i) => {
          const hasData = allDebits.some(t => t.year === activeYear && t.month === i+1)
          return (
            <button key={m} onClick={() => setSelMonth(i+1)} disabled={!hasData} style={{
              flexShrink:0, padding:'5px 11px', borderRadius:20,
              border:`1px solid ${activeMonth===i+1 ? 'var(--accent)' : 'var(--border)'}`,
              background: activeMonth===i+1 ? 'var(--accent)' : 'var(--card)',
              color: activeMonth===i+1 ? '#fff' : hasData ? 'var(--sub)' : 'var(--muted)',
              fontWeight:600, fontSize:11, cursor: hasData ? 'pointer' : 'default',
              opacity: hasData ? 1 : 0.4,
            }}>{m}</button>
          )
        })}
      </div>

      {/* Period summary */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
            {activeMonth ? `${MONTHS[activeMonth-1]} ${activeYear}` : `Full Year ${activeYear}`}
            {selCat && ` · ${CATS[selCat]?.l || selCat}`}
          </div>
          <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{periodTxns.length} transactions</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'var(--accent)' }}>{fmt(periodTxns.reduce((s,t)=>s+(t.amount||0),0), cur)}</div>
          <div style={{ fontSize:10, color:'var(--sub)' }}>total spent</div>
        </div>
      </div>

      {/* Monthly trend chart */}
      <Section title={`📈 Monthly Trend — ${activeYear}${selCat ? ` · ${CATS[selCat]?.l}` : ''}`}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData} barSize={20}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="m" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<TT />} />
            <Bar dataKey="v" radius={[5,5,0,0]} onClick={(d, i) => setSelMonth(activeMonth === i+1 ? null : i+1)}>
              {monthlyData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={activeMonth === i+1 ? 'var(--accent)' : selCat ? CATS[selCat]?.c || 'var(--accent)' : 'var(--accent)'}
                  opacity={activeMonth && activeMonth !== i+1 ? 0.3 : 1}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize:10, color:'var(--muted)', marginTop:6, textAlign:'center' }}>Tap a bar to drill into that month</div>
      </Section>

      {/* Category breakdown */}
      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>
        Spending by Category
        {selCat && <button onClick={() => setSelCat(null)} style={{ marginLeft:10, fontSize:10, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Clear ✕</button>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        {catTotals.length === 0 && (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--sub)', fontSize:12 }}>No transactions for this period</div>
        )}
        {catTotals.map(({ cat, total }) => {
          const max = catTotals[0]?.total || 1
          const pct = Math.round((total / max) * 100)
          const active = selCat === cat
          return (
            <div key={cat} onClick={() => setSelCat(active ? null : cat)} style={{
              background: active ? `${CATS[cat]?.c || '#7C6FFF'}10` : 'var(--card)',
              border:`1px solid ${active ? CATS[cat]?.c || 'var(--accent)' : 'var(--border)'}`,
              borderRadius:12, padding:'12px 14px', cursor:'pointer', transition:'all 0.2s',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{CATS[cat]?.i || '📌'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{CATS[cat]?.l || cat}</div>
                  <div style={{ fontSize:10, color:'var(--sub)', marginTop:1 }}>
                    {periodTxns.filter(t=>t.category===cat).length} transactions
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15, fontWeight:900, color:'var(--text)' }}>{fmt(total, cur)}</div>
                  <div style={{ fontSize:10, color:'var(--sub)' }}>{pct}% of top</div>
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:100, height:6, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:100, background:CATS[cat]?.c || 'var(--accent)', width:`${pct}%`, transition:'width 0.6s ease' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Transaction list for selected category */}
      {selCat && catTxns.length > 0 && (<>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>
          {CATS[selCat]?.i} {CATS[selCat]?.l} Transactions
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {catTxns.slice(0, 50).map((t, i) => (
            <div key={i} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:11, padding:'11px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.merchant || t.description}</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{t.date} · {t.upi_id || t.bank || 'Bank'}</div>
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text)', flexShrink:0 }}>−{fmt(t.amount, cur)}</div>
            </div>
          ))}
          {catTxns.length > 50 && <div style={{ textAlign:'center', fontSize:11, color:'var(--muted)', padding:'8px 0' }}>Showing 50 of {catTxns.length}</div>}
        </div>
      </>)}
    </div>
  )
}
