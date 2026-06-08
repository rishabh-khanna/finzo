/**
 * Finzo — PocketBase Schema
 * Run: pocketbase migrate up
 *
 * Collections:
 *   users          — built-in PocketBase auth collection
 *   statements     — imported statement metadata
 *   transactions   — individual transactions (CC + debit + UPI)
 *   budgets        — AI-set + user-editable monthly budgets
 *   investments    — MF holdings, stocks, SIPs
 */

migrate((db) => {
  // ── STATEMENTS ──────────────────────────────────────────────
  const statements = new Collection({
    name:       'statements',
    type:       'base',
    listRule:   '@request.auth.id = user',
    viewRule:   '@request.auth.id = user',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = user',
    deleteRule: '@request.auth.id = user',
    schema: [
      { name:'user',         type:'relation', required:true, options:{ collectionId:'_pb_users_auth_', maxSelect:1, cascadeDelete:true } },
      { name:'bank',         type:'text',     required:true  },
      { name:'account_type', type:'select',   required:true, options:{ values:['credit_card','debit_card','unknown'] } },
      { name:'month',        type:'number',   required:true  },
      { name:'year',         type:'number',   required:true  },
      { name:'source',       type:'select',   options:{ values:['pdf_upload','email_fetch','manual'] } },
      { name:'total_debit',  type:'number'  },
      { name:'total_credit', type:'number'  },
      { name:'raw_filename', type:'text'    },
    ],
  })
  db.save(statements)

  // ── TRANSACTIONS ────────────────────────────────────────────
  const transactions = new Collection({
    name:       'transactions',
    type:       'base',
    listRule:   '@request.auth.id = user',
    viewRule:   '@request.auth.id = user',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = user',
    deleteRule: '@request.auth.id = user',
    schema: [
      { name:'user',         type:'relation', required:true, options:{ collectionId:'_pb_users_auth_', maxSelect:1, cascadeDelete:true } },
      { name:'statement',    type:'relation', options:{ collectionId:'statements', maxSelect:1 } },
      { name:'date',         type:'text',     required:true  },
      { name:'description',  type:'text'    },
      { name:'merchant',     type:'text'    },
      { name:'amount',       type:'number',   required:true  },
      { name:'type',         type:'select',   required:true, options:{ values:['debit','credit'] } },
      { name:'category',     type:'text'    },
      { name:'upi_id',       type:'text'    },
      { name:'source',       type:'select',   options:{ values:['cc_statement','debit_statement','upi_email','cc_alert','manual'] } },
      { name:'account_type', type:'select',   options:{ values:['credit_card','debit_card','unknown'] } },
      { name:'bank',         type:'text'    },
      { name:'anomaly',      type:'bool'    },
      { name:'anomaly_reason',type:'text'   },
      { name:'raw_desc',     type:'text'    },
      // Derived fields for faster queries
      { name:'month',        type:'number'  },
      { name:'year',         type:'number'  },
    ],
    indexes: [
      'CREATE INDEX idx_txn_user_month ON transactions (user, year, month)',
      'CREATE INDEX idx_txn_category ON transactions (user, category)',
      'CREATE INDEX idx_txn_date ON transactions (date)',
    ],
  })
  db.save(transactions)

  // ── BUDGETS ─────────────────────────────────────────────────
  const budgets = new Collection({
    name:       'budgets',
    type:       'base',
    listRule:   '@request.auth.id = user',
    viewRule:   '@request.auth.id = user',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = user',
    deleteRule: '@request.auth.id = user',
    schema: [
      { name:'user',      type:'relation', required:true, options:{ collectionId:'_pb_users_auth_', maxSelect:1, cascadeDelete:true } },
      { name:'category',  type:'text',    required:true },
      { name:'limit',     type:'number',  required:true },
      { name:'month',     type:'number',  required:true },
      { name:'year',      type:'number',  required:true },
      { name:'ai_set',    type:'bool',    options:{ default:true } },
      { name:'ai_reason', type:'text' },
    ],
  })
  db.save(budgets)

  // ── INVESTMENTS ─────────────────────────────────────────────
  const investments = new Collection({
    name:       'investments',
    type:       'base',
    listRule:   '@request.auth.id = user',
    viewRule:   '@request.auth.id = user',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = user',
    deleteRule: '@request.auth.id = user',
    schema: [
      { name:'user',        type:'relation', required:true, options:{ collectionId:'_pb_users_auth_', maxSelect:1, cascadeDelete:true } },
      { name:'name',        type:'text',    required:true },
      { name:'type',        type:'select',  required:true, options:{ values:['mutual_fund','stock','fd','ppf','nps','gold','crypto','other'] } },
      { name:'invested',    type:'number' },
      { name:'current',     type:'number' },
      { name:'units',       type:'number' },
      { name:'nav',         type:'number' },
      { name:'sip_amount',  type:'number' },
      { name:'sip_date',    type:'number' },
      { name:'sector',      type:'text'   },
      { name:'risk',        type:'select', options:{ values:['low','moderate','high'] } },
      { name:'broker',      type:'text'   },
      { name:'folio',       type:'text'   },
      { name:'isin',        type:'text'   },
      { name:'last_updated',type:'text'   },
    ],
  })
  db.save(investments)
}, (db) => {
  // Rollback
  ;['investments','budgets','transactions','statements'].forEach(name => {
    const c = db.findCollectionByNameOrId(name)
    if (c) db.delete(c)
  })
})
