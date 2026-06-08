import { useState } from 'react'
import { supabase } from '../lib/db.js'
import { useStore } from '../lib/useStore.js'

export default function Login() {
  const { actions } = useStore()
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } }
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380, textAlign:'center' }}>
        {/* Logo */}
        <div style={{ width:56, height:56, borderRadius:16, background:'var(--gradient)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, color:'#fff', fontWeight:900, fontFamily:'Georgia,serif', margin:'0 auto 20px', boxShadow:'0 8px 32px rgba(124,111,255,0.45)' }}>F</div>

        <h1 style={{ fontSize:26, fontWeight:900, color:'var(--text)', letterSpacing:'-0.6px', marginBottom:6 }}>Welcome to Finzo</h1>
        <p style={{ fontSize:13, color:'var(--sub)', marginBottom:8 }}>Your complete financial OS</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:28 }}>
          {['💸 Spending','📈 Investments','🏦 Net Worth','🤖 AI Advisor'].map(f => (
            <span key={f} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'3px 10px', fontSize:11, color:'var(--sub)' }}>{f}</span>
          ))}
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'24px 22px' }}>
          {/* Tab toggle */}
          <div style={{ display:'flex', background:'var(--bg)', borderRadius:10, padding:3, marginBottom:20 }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{ flex:1, padding:'9px', borderRadius:8, border:'none', cursor:'pointer', background: mode===m ? 'var(--accent)' : 'transparent', color: mode===m ? '#fff' : 'var(--sub)', fontWeight:700, fontSize:13, textTransform:'capitalize' }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handle}>
            {mode === 'signup' && (
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:11, color:'var(--sub)', fontWeight:600, marginBottom:5 }}>Full Name</label>
                <input className="input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--sub)', fontWeight:600, marginBottom:5 }}>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--sub)', fontWeight:600, marginBottom:5 }}>Password</label>
              <input className="input" type="password" placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && (
              <div style={{ background:'rgba(255,92,92,0.1)', border:'1px solid rgba(255,92,92,0.3)', borderRadius:8, padding:'9px 12px', marginBottom:14, fontSize:12, color:'var(--danger)' }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:11, background: loading ? 'var(--muted)' : 'var(--gradient)', border:'none', color:'#fff', fontWeight:800, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 24px rgba(124,111,255,0.35)' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In →' : 'Create Account →'}
            </button>
          </form>

          <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontSize:10, color:'var(--muted)' }}>Private · Secure · Free</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>
          <p style={{ fontSize:11, color:'var(--muted)', marginTop:12, lineHeight:1.7 }}>
            🔒 PDF parsing happens in your browser. Your statements never leave your device.
          </p>
        </div>
      </div>
    </div>
  )
}
