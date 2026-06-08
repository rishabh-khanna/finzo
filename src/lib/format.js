export const CURRENCIES = {
  INR: { s:'₹', r:1 },
  USD: { s:'$', r:0.012 },
  GBP: { s:'£', r:0.0095 },
  EUR: { s:'€', r:0.011 },
}

export function fmt(n, cur = 'INR') {
  const num = Number(n)
  if (isNaN(num) || !isFinite(num)) return '—'
  const c = CURRENCIES[cur] || CURRENCIES.INR
  const v = num * c.r
  if (v >= 10000000) return `${c.s}${(v/10000000).toFixed(2)}Cr`
  if (v >= 100000)   return `${c.s}${(v/100000).toFixed(1)}L`
  if (v >= 1000)     return `${c.s}${(v/1000).toFixed(1)}K`
  return `${c.s}${Math.round(v).toLocaleString('en-IN')}`
}

export function pctChange(a, b) {
  if (!b) return 0
  return Math.round(((a - b) / b) * 100)
}

export const CATS = {
  food:          { c:'#FF6B6B', i:'🍔', l:'Food & Dining'  },
  groceries:     { c:'#FFA94D', i:'🛒', l:'Groceries'      },
  shopping:      { c:'#FFD166', i:'🛍️', l:'Shopping'       },
  transport:     { c:'#00D48F', i:'🚕', l:'Transport'      },
  subscriptions: { c:'#5B9CF6', i:'📱', l:'Subscriptions'  },
  health:        { c:'#FF9F43', i:'💊', l:'Health'         },
  utilities:     { c:'#A55EEA', i:'💡', l:'Utilities'      },
  travel:        { c:'#26C6DA', i:'✈️', l:'Travel'         },
  emi:           { c:'#EC407A', i:'🏦', l:'EMI / Loans'    },
  entertainment: { c:'#7E57C2', i:'🎬', l:'Entertainment'  },
  education:     { c:'#42B883', i:'📚', l:'Education'      },
  investments:   { c:'#00D48F', i:'📈', l:'Investments'    },
  income:        { c:'#00D48F', i:'💰', l:'Income'         },
  fees:          { c:'#78909C', i:'🏛️', l:'Bank Fees'      },
  transfer:      { c:'#90A4AE', i:'↔️', l:'Transfer'       },
  other:         { c:'#78909C', i:'📌', l:'Other'          },
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']