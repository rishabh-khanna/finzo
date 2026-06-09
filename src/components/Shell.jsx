import { useState, useEffect } from 'react'
import { useStore } from '../lib/useStore.jsx'
import { auth } from '../lib/db.js'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import AIChat from './AIChat.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Transactions from '../pages/Transactions.jsx'
import Categories from '../pages/Categories.jsx'
import Recurring from '../pages/Recurring.jsx'
import Budgets from '../pages/Budgets.jsx'
import Subscriptions from '../pages/Subscriptions.jsx'
import Investments from '../pages/Investments.jsx'
import NetWorth from '../pages/NetWorth.jsx'
import AIAdvisor from '../pages/AIAdvisor.jsx'
import Import from '../pages/Import.jsx'
import Settings from '../pages/Settings.jsx'

export default function Shell() {
  const { state, actions } = useStore()
  const [page, setPage]     = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(window.innerWidth >= 768)
  const [sideMini, setSideMini] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const fn = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) { setSideOpen(false); setSideMini(false) }
      else { setSideOpen(true); setSideMini(false) }
    }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const onToggle = () => {
    if (isMobile) { setSideOpen(o => !o); setSideMini(false) }
    else {
      if (sideOpen) { setSideOpen(false); setSideMini(true) }
      else if (sideMini) { setSideMini(false) }
      else { setSideOpen(true) }
    }
  }

  const onLogout = () => { auth.logout(); actions.logout() }

  const pages = {
    dashboard:    <Dashboard setPage={setPage} />,
    transactions: <Transactions />,
    categories:   <Categories />,
    recurring:    <Recurring />,
    budgets:      <Budgets />,
    subscriptions:<Subscriptions />,
    investments:  <Investments />,
    networth:     <NetWorth />,
    ai_advisor:   <AIAdvisor />,
    import:       <Import onDone={() => setPage('dashboard')} />,
    settings:     <Settings onLogout={onLogout} />,
  }

  return (
    <div style={{ display:'flex', height:'100dvh', overflow:'hidden', background:'var(--bg)' }}>
      <Sidebar
        page={page} setPage={setPage}
        open={sideOpen} mini={sideMini}
        onToggle={onToggle} isMobile={isMobile}
        onLogout={onLogout}
      />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar page={page} setPage={setPage} sideOpen={sideOpen} sideMini={sideMini} onHamburger={onToggle} />
        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          {pages[page] || pages.dashboard}
        </main>
      </div>
      <AIChat />
    </div>
  )
}