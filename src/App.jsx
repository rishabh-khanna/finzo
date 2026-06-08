import { useState, useEffect } from 'react'
import { StoreProvider, useStore } from './lib/useStore.js'
import { supabase } from './lib/db.js'
import Login from './pages/Login.jsx'
import Shell from './components/Shell.jsx'

function AppInner() {
  const { state, actions } = useStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) actions.setUser(session.user)
      setChecking(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      actions.setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) return null

  return state.isLoggedIn ? <Shell /> : <Login />
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
