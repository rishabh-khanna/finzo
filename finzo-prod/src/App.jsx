import { useState, useEffect } from 'react'
import { StoreProvider, useStore } from './lib/useStore.js'
import { auth } from './lib/db.js'
import Login from './pages/Login.jsx'
import Shell from './components/Shell.jsx'

function AppInner() {
  const { state, actions } = useStore()
  const [checking, setChecking] = useState(true)

  // Check if user is already logged in (PocketBase persists auth in localStorage)
  useEffect(() => {
    const stored = auth.user
    if (stored && auth.isLoggedIn) {
      actions.setUser(stored)
    }
    setChecking(false)

    // Listen to auth changes
    const unsub = auth.onChange((token, model) => {
      actions.setUser(model)
    })
    return unsub
  }, [])

  if (checking) return null // brief flash prevention

  if (!state.isLoggedIn) {
    return <Login />
  }

  return <Shell />
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
