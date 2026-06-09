/**
 * Finzo Backend — Email Transaction Parser
 * Parses UPI alert emails and CC transaction alert emails
 * into structured transaction objects
 */

const PATTERNS = [
  // HDFC UPI: "Rs.485.00 debited from A/c ...to VPA swiggy@icici"
  {
    bank: 'hdfc', type: 'upi_email',
    regex: /Rs\.([\d,]+\.?\d*)\s+(debited|credited).*?(?:VPA|UPI\s*ID|UPI\s*Ref)[:\s]*([\w.@\-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(/,/g, '')),
      txnType:  m[2].toLowerCase() === 'credited' ? 'credit' : 'debit',
      upiId:    m[3],
      merchant: merchantFromUPI(m[3]),
    })
  },
  // SBI: "INR 320.00 debited from ...VPA zomato@paytm"
  {
    bank: 'sbi', type: 'upi_email',
    regex: /INR\s+([\d,]+\.?\d*)\s+(debited|credited).*?VPA[:\s]*([\w.@\-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(/,/g, '')),
      txnType:  m[2].toLowerCase() === 'credited' ? 'credit' : 'debit',
      upiId:    m[3],
      merchant: merchantFromUPI(m[3]),
    })
  },
  // ICICI: "debited for Rs 143.00...UPI:uber@ybl"
  {
    bank: 'icici', type: 'upi_email',
    regex: /(debited|credited)\s+for\s+Rs\.?\s*([\d,]+\.?\d*).*?UPI[:\s]*([\w.@\-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[2].replace(/,/g, '')),
      txnType:  m[1].toLowerCase() === 'credited' ? 'credit' : 'debit',
      upiId:    m[3],
      merchant: merchantFromUPI(m[3]),
    })
  },
  // Axis: "INR 215.00 paid to ola@paytm"
  {
    bank: 'axis', type: 'upi_email',
    regex: /INR\s+([\d,]+\.?\d*)\s+(?:paid|sent)\s+to\s+([\w.@\-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(/,/g, '')),
      txnType:  'debit',
      upiId:    m[2],
      merchant: merchantFromUPI(m[2]),
    })
  },
  // CC Alert: "transaction of INR 649 on your card...at NETFLIX"
  {
    bank: 'generic', type: 'cc_alert',
    regex: /(?:transaction|txn|purchase)\s+of\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:at|merchant)[:\s]+([A-Z][A-Z0-9\s*]+?)(?:\.|,|on\s+\d)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(/,/g, '')),
      txnType:  'debit',
      upiId:    null,
      merchant: cleanMerchantName(m[2].trim()),
    })
  },
  // Generic debit: "debited Rs. X to/for merchant"
  {
    bank: 'generic', type: 'upi_email',
    regex: /(?:debited|paid|sent)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:to|for|towards)\s+(?:UPI[\/\-])?([\w.]+@[\w.]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(/,/g, '')),
      txnType:  'debit',
      upiId:    m[2],
      merchant: merchantFromUPI(m[2]),
    })
  },
  // Credit received: "INR X credited to your account from Y"
  {
    bank: 'generic', type: 'upi_email',
    regex: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+credited.*?(?:from|by)\s+([\w\s]+?)(?:\.|on\s+\d)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(/,/g, '')),
      txnType:  'credit',
      upiId:    null,
      merchant: m[2].trim(),
    })
  },
]

// ── EXTRACT DATE FROM EMAIL BODY ──────────────────────────────
function extractDate(text = '') {
  const patterns = [
    /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,
    /(\d{2}\s+\w{3}\s+\d{4})/,
    /on\s+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1]
  }
  return new Date().toISOString().split('T')[0]
}

// ── UPI ID TO MERCHANT NAME ───────────────────────────────────
function merchantFromUPI(upiId = '') {
  const handle = upiId.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  const MAP = {
    'swiggy':        'Swiggy',
    'zomato':        'Zomato',
    'uber':          'Uber',
    'ola':           'Ola Cabs',
    'rapido':        'Rapido',
    'netflix':       'Netflix',
    'hotstar':       'Hotstar',
    'spotify':       'Spotify',
    'youtube':       'YouTube Premium',
    'amazon':        'Amazon Pay',
    'flipkart':      'Flipkart',
    'dmart':         'DMart',
    'bigbasket':     'Big Basket',
    'blinkit':       'Blinkit',
    'zepto':         'Zepto',
    'jio':           'Reliance Jio',
    'airtel':        'Airtel',
    'tatapower':     'Tata Power',
    'apollo':        'Apollo Pharmacy',
    'medplus':       'MedPlus',
    'inox':          'INOX Cinemas',
    'pvr':           'PVR Cinemas',
    'irctc':         'IRCTC',
    'bookmyshow':    'BookMyShow',
    'groww':         'Groww',
    'zerodha':       'Zerodha',
    'paytm':         'Paytm',
    'phonepe':       'PhonePe',
    'gpay':          'Google Pay',
  }
  return MAP[handle] || cleanMerchantName(upiId.split('@')[0])
}

// ── CLEAN MERCHANT NAME ───────────────────────────────────────
function cleanMerchantName(raw = '') {
  return raw
    .replace(/[*_\d]{4,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 40) || 'Unknown'
}

// ── CATEGORIZE TRANSACTION ────────────────────────────────────
function categorize(merchant = '', upiId = '') {
  const text = `${merchant} ${upiId}`.toLowerCase()
  if (/swiggy|zomato|uber eats|food|restaurant|cafe|dhaba|biryani/.test(text)) return 'food'
  if (/dmart|bigbasket|blinkit|zepto|grocer|kirana|supermarket/.test(text)) return 'groceries'
  if (/amazon|flipkart|myntra|ajio|nykaa|shopping|retail/.test(text)) return 'shopping'
  if (/uber|ola|rapido|taxi|metro|irctc|bus|train|fastag|petrol|fuel/.test(text)) return 'transport'
  if (/netflix|hotstar|spotify|youtube|prime|zee5|sonyliv/.test(text)) return 'subscriptions'
  if (/airtel|jio|bsnl|vodafone|broadband|internet|recharge/.test(text)) return 'utilities'
  if (/tata power|electricity|water|gas|bescom|msedcl/.test(text)) return 'utilities'
  if (/apollo|medplus|pharma|hospital|doctor|clinic|health/.test(text)) return 'health'
  if (/air india|indigo|flight|hotel|oyo|makemytrip|goibibo/.test(text)) return 'travel'
  if (/inox|pvr|cinema|movie|concert|bookmyshow/.test(text)) return 'entertainment'
  if (/groww|zerodha|sip|mutual fund|upstox|nse|bse/.test(text)) return 'investments'
  if (/salary|payroll/.test(text)) return 'income'
  if (/emi|loan/.test(text)) return 'emi'
  return 'other'
}

// ── MAIN: PARSE EMAILS TO TRANSACTIONS ───────────────────────
function parseEmailsToTransactions(emails = []) {
  const results = []
  const seen    = new Set()

  for (const email of emails) {
    const { bodyText = '', sender = '', subject = '', date: emailDate } = email

    // Try each pattern
    for (const pattern of PATTERNS) {
      const match = bodyText.match(pattern.regex)
      if (!match) continue

      try {
        const extracted = pattern.extract(match)
        if (!extracted.amount || extracted.amount <= 0 || extracted.amount > 10000000) continue

        const dateStr  = emailDate || extractDate(bodyText)
        const merchant = extracted.merchant || 'Unknown'
        const category = categorize(merchant, extracted.upiId || '')

        // Dedup key
        const key = `${dateStr}-${extracted.amount}-${merchant}`
        if (seen.has(key)) break
        seen.add(key)

        results.push({
          date:         dateStr,
          description:  subject || `${extracted.txnType === 'credit' ? 'Received from' : 'Paid to'} ${merchant}`,
          merchant,
          amount:       extracted.amount,
          type:         extracted.txnType,
          category,
          upi_id:       extracted.upiId || null,
          source:       pattern.type,
          account_type: pattern.type === 'cc_alert' ? 'credit_card' : 'debit_card',
          bank:         pattern.bank,
          anomaly:      false,
          month:        new Date(dateStr).getMonth() + 1 || new Date().getMonth() + 1,
          year:         new Date(dateStr).getFullYear() || new Date().getFullYear(),
        })
        break // stop at first matching pattern
      } catch (e) {
        continue
      }
    }
  }

  return results
}

module.exports = { parseEmailsToTransactions, merchantFromUPI, categorize }
