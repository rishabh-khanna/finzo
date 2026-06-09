/**
 * Finzo — Global State
 * Simple React Context + useReducer — no Redux needed
 * Keeps app lightweight
 */
import { createContext, useContext, useReducer, useCallback } from 'react'

// ── INITIAL STATE ─────────────────────────────────────────────
const initial = {
  // Auth
  user:         null,
  isLoggedIn:   false,

  // Theme
  theme:        localStorage.getItem('finzo_theme') || 'dark',

  // Currency
  currency:     localStorage.getItem('finzo_currency') || 'INR',

  // Data
  transactions: [],
  statements:   [],
  budgets:      {},
  investments:  [],

  // UI
  loading:      false,
  loadingMsg:   '',
  error:        null,

  // Filters
  selectedMonth: new Date().getMonth() + 1,
  selectedYear:  new Date().getFullYear(),
}

// ── REDUCER ───────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isLoggedIn: !!action.payload }

    case 'SET_THEME': {
      const theme = action.payload
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('finzo_theme', theme)
      return { ...state, theme }
    }

    case 'SET_CURRENCY':
      localStorage.setItem('finzo_currency', action.payload)
      return { ...state, currency: action.payload }

    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload }

    case 'ADD_TRANSACTIONS':
      return {
        ...state,
        transactions: [...state.transactions, ...action.payload]
          .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
      }

    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        )
      }

    case 'SET_STATEMENTS':
      return { ...state, statements: action.payload }

    case 'SET_BUDGETS':
      return { ...state, budgets: action.payload }

    case 'SET_INVESTMENTS':
      return { ...state, investments: action.payload }

    case 'SET_LOADING':
      return { ...state, loading: action.payload, loadingMsg: action.msg || '' }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'SET_MONTH':
      return { ...state, selectedMonth: action.month, selectedYear: action.year }

    case 'LOGOUT':
      return { ...initial, isLoggedIn: false, user: null, theme: state.theme, currency: state.currency }

    default:
      return state
  }
}

// ── CONTEXT ───────────────────────────────────────────────────
const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)

  // Apply saved theme on mount
  document.documentElement.setAttribute('data-theme', state.theme)

  const actions = {
    setUser:         (user) => dispatch({ type:'SET_USER', payload: user }),
    toggleTheme:     () => dispatch({ type:'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' }),
    setCurrency:     (cur) => dispatch({ type:'SET_CURRENCY', payload: cur }),
    setTransactions: (txns) => dispatch({ type:'SET_TRANSACTIONS', payload: txns }),
    addTransactions: (txns) => dispatch({ type:'ADD_TRANSACTIONS', payload: txns }),
    updateTxn:       (txn) => dispatch({ type:'UPDATE_TRANSACTION', payload: txn }),
    setStatements:   (s) => dispatch({ type:'SET_STATEMENTS', payload: s }),
    setBudgets:      (b) => dispatch({ type:'SET_BUDGETS', payload: b }),
    setInvestments:  (inv) => dispatch({ type:'SET_INVESTMENTS', payload: inv }),
    setLoading:      (loading, msg) => dispatch({ type:'SET_LOADING', payload: loading, msg }),
    setError:        (err) => dispatch({ type:'SET_ERROR', payload: err }),
    setMonth:        (month, year) => dispatch({ type:'SET_MONTH', month, year }),
    logout:          () => { dispatch({ type:'LOGOUT' }) },
  }

  return (
    <StoreContext.Provider value={{ state, actions }}>
      {children}
    </StoreContext.Provider>
  )
}

// ── HOOK ──────────────────────────────────────────────────────
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// ── SELECTORS ─────────────────────────────────────────────────
export function useTransactions() {
  const { state } = useStore()
  const { transactions, selectedMonth, selectedYear } = state

  const filtered = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
  })

  const debits  = filtered.filter(t => t.type === 'debit')
  const credits = filtered.filter(t => t.type === 'credit')

  // Separate CC and debit/UPI
  const ccTxns    = filtered.filter(t => t.account_type === 'credit_card' || t.source === 'cc_statement' || t.source === 'cc_alert')
  const debitTxns = filtered.filter(t => t.account_type === 'debit_card'  || t.source === 'debit_statement' || t.source === 'upi_email')

  const totalSpent  = debits.reduce((s, t) => s + (t.amount || 0), 0)
  const totalIncome = credits.reduce((s, t) => s + (t.amount || 0), 0)

  // Category breakdown
  const byCategory = {}
  for (const t of debits) {
    if (!byCategory[t.category]) byCategory[t.category] = 0
    byCategory[t.category] += t.amount || 0
  }

  // Anomalies
  const anomalies = filtered.filter(t => t.anomaly)

  return { filtered, debits, credits, ccTxns, debitTxns, totalSpent, totalIncome, byCategory, anomalies }
}
