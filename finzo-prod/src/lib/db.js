/**
 * Finzo — PocketBase DB client
 * Replace PB_URL with your Fly.io URL after deployment
 */
import PocketBase from 'pocketbase'

// ── CONFIG ────────────────────────────────────────────────────
// During local dev: http://127.0.0.1:8090
// After deploy:     https://finzo-pb.fly.dev  (your Fly.io URL)
const PB_URL = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(PB_URL)

// Auto-refresh auth token
pb.autoCancellation(false)

// ── AUTH ──────────────────────────────────────────────────────
export const auth = {
  /** Sign up with email + password */
  async signup(email, password, name) {
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name,
    })
    await pb.collection('users').authWithPassword(email, password)
    return user
  },

  /** Login */
  async login(email, password) {
    return pb.collection('users').authWithPassword(email, password)
  },

  /** Logout */
  logout() {
    pb.authStore.clear()
  },

  /** Current user */
  get user() {
    return pb.authStore.model
  },

  /** Is logged in */
  get isLoggedIn() {
    return pb.authStore.isValid
  },

  /** Listen to auth state changes */
  onChange(cb) {
    return pb.authStore.onChange(cb)
  }
}

// ── STATEMENTS ────────────────────────────────────────────────
export const statements = {
  /** Create a statement record after parsing */
  async create(data) {
    return pb.collection('statements').create({
      user: auth.user?.id,
      bank: data.bank,
      account_type: data.accountType,  // 'credit' | 'debit'
      month: data.month,
      year: data.year,
      source: data.source,             // 'pdf_upload' | 'email_fetch'
      total_debit: data.totalDebit,
      total_credit: data.totalCredit,
      raw_filename: data.filename,
    })
  },

  /** List all statements for current user */
  async list() {
    return pb.collection('statements').getFullList({
      filter: `user = "${auth.user?.id}"`,
      sort: '-created',
    })
  }
}

// ── TRANSACTIONS ──────────────────────────────────────────────
export const transactions = {
  /** Bulk insert transactions after parsing */
  async bulkCreate(txns, statementId) {
    const results = []
    // PocketBase doesn't have bulk insert — batch in groups of 20
    const chunks = []
    for (let i = 0; i < txns.length; i += 20) {
      chunks.push(txns.slice(i, i + 20))
    }
    for (const chunk of chunks) {
      const promises = chunk.map(t =>
        pb.collection('transactions').create({
          user:         auth.user?.id,
          statement:    statementId,
          date:         t.date,
          description:  t.description,
          merchant:     t.merchant,
          amount:       t.amount,
          type:         t.type,          // 'debit' | 'credit'
          category:     t.category,
          upi_id:       t.upiId || '',
          source:       t.source,        // 'cc_statement' | 'debit_statement' | 'upi_email' | 'cc_alert'
          account_type: t.accountType,   // 'credit_card' | 'debit_card'
          bank:         t.bank,
          anomaly:      t.anomaly || false,
          raw_desc:     t.rawDesc || t.description,
        })
      )
      const res = await Promise.allSettled(promises)
      results.push(...res)
    }
    return results
  },

  /** Get all transactions with filters */
  async list({ month, year, category, type, source, accountType } = {}) {
    const filters = [`user = "${auth.user?.id}"`]
    if (month)       filters.push(`month = ${month}`)
    if (year)        filters.push(`year = ${year}`)
    if (category)    filters.push(`category = "${category}"`)
    if (type)        filters.push(`type = "${type}"`)
    if (source)      filters.push(`source = "${source}"`)
    if (accountType) filters.push(`account_type = "${accountType}"`)

    return pb.collection('transactions').getFullList({
      filter: filters.join(' && '),
      sort: '-date',
    })
  },

  /** Get transactions for a month */
  async forMonth(year, month) {
    return pb.collection('transactions').getFullList({
      filter: `user = "${auth.user?.id}" && year = ${year} && month = ${month}`,
      sort: '-date',
    })
  },

  /** Update category (user correction) */
  async updateCategory(id, category) {
    return pb.collection('transactions').update(id, { category })
  }
}

// ── BUDGETS ───────────────────────────────────────────────────
export const budgets = {
  async upsert(category, limit, year, month) {
    const existing = await pb.collection('budgets').getList(1, 1, {
      filter: `user = "${auth.user?.id}" && category = "${category}" && year = ${year} && month = ${month}`
    })
    if (existing.items.length) {
      return pb.collection('budgets').update(existing.items[0].id, { limit })
    }
    return pb.collection('budgets').create({
      user: auth.user?.id, category, limit, year, month
    })
  },

  async forMonth(year, month) {
    return pb.collection('budgets').getFullList({
      filter: `user = "${auth.user?.id}" && year = ${year} && month = ${month}`
    })
  }
}

// ── INVESTMENTS ───────────────────────────────────────────────
export const investments = {
  async upsert(holding) {
    const existing = await pb.collection('investments').getList(1, 1, {
      filter: `user = "${auth.user?.id}" && name = "${holding.name}" && type = "${holding.type}"`
    })
    const data = { user: auth.user?.id, ...holding }
    if (existing.items.length) {
      return pb.collection('investments').update(existing.items[0].id, data)
    }
    return pb.collection('investments').create(data)
  },

  async list() {
    return pb.collection('investments').getFullList({
      filter: `user = "${auth.user?.id}"`,
      sort: 'type,name'
    })
  }
}
