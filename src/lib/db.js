/**
 * Finzo — Supabase DB client
 * Free tier: no credit card, no expiry
 * Set env vars: VITE_SUPABASE_URL and VITE_SUPABASE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── AUTH ──────────────────────────────────────────────────────
export const auth = {
  async signup(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    })
    if (error) throw error
    return data
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async logout() {
    await supabase.auth.signOut()
  },

  get user() {
    return supabase.auth.user?.() || null
  },

  get isLoggedIn() {
    const session = supabase.auth.session?.()
    return !!session
  },

  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session?.user || null)
    })
    return () => data?.subscription?.unsubscribe()
  }
}

// ── TRANSACTIONS ──────────────────────────────────────────────
export const transactions = {
  async bulkCreate(txns) {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not logged in')
    const rows = txns.map(t => ({ ...t, user_id: user.id }))
    // Insert in chunks of 50
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase.from('transactions').insert(rows.slice(i, i+50))
      if (error) console.error('Insert error:', error)
    }
  },

  async forMonth(year, month) {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return []
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async all() {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return []
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async updateCategory(id, category) {
    const { error } = await supabase
      .from('transactions')
      .update({ category })
      .eq('id', id)
    if (error) throw error
  }
}

// ── STATEMENTS ────────────────────────────────────────────────
export const statements = {
  async create(data) {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not logged in')
    const { data: result, error } = await supabase
      .from('statements')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return result
  },

  async list() {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return []
    const { data, error } = await supabase
      .from('statements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
}

// ── BUDGETS ───────────────────────────────────────────────────
export const budgets = {
  async upsert(category, limit_amount, year, month, ai_reason = '') {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not logged in')
    const { error } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.id,
        category, limit_amount, year, month, ai_reason,
        ai_set: !!ai_reason
      }, { onConflict: 'user_id,category,year,month' })
    if (error) throw error
  },

  async forMonth(year, month) {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return []
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
    if (error) throw error
    return data || []
  }
}

// ── INVESTMENTS ───────────────────────────────────────────────
export const investments = {
  async upsert(holding) {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not logged in')
    const { error } = await supabase
      .from('investments')
      .upsert({ ...holding, user_id: user.id }, { onConflict: 'user_id,name,type' })
    if (error) throw error
  },

  async list() {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return []
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('type')
    if (error) throw error
    return data || []
  }
}
