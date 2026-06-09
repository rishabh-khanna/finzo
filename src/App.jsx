import { useState, useEffect } from 'react'
import { StoreProvider, useStore } from './lib/useStore.jsx'
import { supabase } from './lib/db.js'
import Login from './pages/Login.jsx'
import Shell from './components/Shell.jsx'

function AppInner() {
  const { state, actions } = useStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) actions.setUser(session.user)
      setChecking(false)
    }).catch(() => setChecking(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      actions.setUser(session?.user || null)
    })
    return () => subscription?.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight:'100dvh', background:'#07080F', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#7C6FFF,#FF6B9D)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, color:'#fff', fontWeight:900, margin:'0 auto 16px', animation:'pulse 1.5s infinite' }}>F</div>
          <div style={{ color:'#6870A0', fontSize:13 }}>Loading Finzo...</div>
        </div>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`}</style>
      </div>
    )
  }

  return state.isLoggedIn ? <Shell /> : <Login />
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
