/**
 * Finzo — Email Transaction Parser
 * Parses UPI alert emails and CC transaction alert emails
 * Works with email content pasted by user (v1)
 * Gmail API integration in v2
 */
import { categorize, cleanMerchant, merchantFromUPI } from './merchantRules.js'

// ── EMAIL PATTERNS ────────────────────────────────────────────
const EMAIL_PATTERNS = [
  // HDFC UPI Alert: "Rs.485.00 debited from A/c ...to VPA swiggy@icici"
  {
    bank: 'hdfc',
    type: 'upi_email',
    regex: /Rs\.([\d,]+\.\d{2})\s+(debited|credited)\s+from\s+A\/c[^.]*\.?\s*.*?(?:VPA|UPI ID)\s+([\w.@-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(',', '')),
      type:     m[2].toLowerCase() === 'credited' ? 'credit' : 'debit',
      upiId:    m[3],
      merchant: merchantFromUPI(m[3]) || cleanMerchant(m[3]),
    })
  },

  // SBI UPI Alert: "Dear Customer, INR 320.00 debited from SBI A/C ... UPI Ref...VPA zomato@paytm"
  {
    bank: 'sbi',
    type: 'upi_email',
    regex: /INR\s+([\d,]+\.?\d*)\s+(debited|credited).*?VPA\s+([\w.@-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(',', '')),
      type:     m[2].toLowerCase() === 'credited' ? 'credit' : 'debit',
      upiId:    m[3],
      merchant: merchantFromUPI(m[3]) || cleanMerchant(m[3]),
    })
  },

  // ICICI UPI Alert: "ICICI Bank Account XX123 debited for Rs 143.00... UPI:uber@ybl"
  {
    bank: 'icici',
    type: 'upi_email',
    regex: /(?:debited|credited)\s+for\s+Rs\.?\s*([\d,]+\.?\d*).*?UPI[:\s]+([\w.@-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(',', '')),
      type:     /debited/i.test(m[0]) ? 'debit' : 'credit',
      upiId:    m[2],
      merchant: merchantFromUPI(m[2]) || cleanMerchant(m[2]),
    })
  },

  // Generic CC Alert: "Transaction of INR 649 done on your HDFC Credit Card...at NETFLIX"
  {
    bank: 'generic',
    type: 'cc_alert',
    regex: /(?:transaction|txn|payment)\s+of\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+(?:done|made|processed).*?at\s+([A-Z][A-Z\s*]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(',', '')),
      type:     'debit',
      upiId:    null,
      merchant: cleanMerchant(m[2]),
    })
  },

  // Axis Bank UPI: "Axis Bank: INR 215.00 paid to ola@paytm on DD-MM-YYYY"
  {
    bank: 'axis',
    type: 'upi_email',
    regex: /INR\s+([\d,]+\.?\d*)\s+paid\s+to\s+([\w.@-]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(',', '')),
      type:     'debit',
      upiId:    m[2],
      merchant: merchantFromUPI(m[2]) || cleanMerchant(m[2]),
    })
  },

  // Generic UPI: "debited Rs. X to UPI/merchant@bank"
  {
    bank: 'generic',
    type: 'upi_email',
    regex: /(?:debited|paid)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:to|towards)\s+(?:UPI[\/\-])?([\w.]+@[\w.]+)/i,
    extract: (m) => ({
      amount:   parseFloat(m[1].replace(',', '')),
      type:     'debit',
      upiId:    m[2],
      merchant: merchantFromUPI(m[2]) || cleanMerchant(m[2]),
    })
  },
]

// ── DATE EXTRACTOR ────────────────────────────────────────────
function extractDate(emailText) {
  const patterns = [
    /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
    /(\d{2}\s+\w{3}\s+\d{4})/,
    /(\d{2}\s+\w+\s+\d{4})/,
    /on\s+(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
    /dated?\s+(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
  ]
  for (const p of patterns) {
    const m = emailText.match(p)
    if (m) return m[1]
  }
  return new Date().toISOString().split('T')[0]
}

// ── PARSE SINGLE EMAIL ────────────────────────────────────────
/**
 * Parse a single email body text into a transaction
 * @param {string} emailBody - Raw email text content
 * @param {string} senderEmail - From: address (used for bank detection)
 * @returns {Object|null} Transaction object or null
 */
export function parseEmail(emailBody, senderEmail = '') {
  if (!emailBody?.trim()) return null

  // Detect bank from sender
  const senderBank = detectBankFromSender(senderEmail)

  // Try each pattern
  for (const pattern of EMAIL_PATTERNS) {
    const match = emailBody.match(pattern.regex)
    if (!match) continue

    try {
      const extracted = pattern.extract(match)
      if (!extracted.amount || extracted.amount <= 0) continue

      const dateStr = extractDate(emailBody)
      const merchant = extracted.merchant || 'Unknown'

      return {
        date:        dateStr,
        description: `${extracted.type === 'debit' ? 'Paid to' : 'Received from'} ${merchant}`,
        merchant,
        amount:      extracted.amount,
        type:        extracted.type,
        category:    categorize(merchant, extracted.upiId || ''),
        upiId:       extracted.upiId || null,
        source:      pattern.type,        // 'upi_email' | 'cc_alert'
        accountType: pattern.type === 'cc_alert' ? 'credit_card' : 'debit_card',
        bank:        senderBank || pattern.bank,
        anomaly:     false,
        rawDesc:     emailBody.slice(0, 200),
      }
    } catch (e) {
      continue
    }
  }

  return null
}

// ── DETECT BANK FROM SENDER ───────────────────────────────────
export function detectBankFromSender(email = '') {
  const e = email.toLowerCase()
  if (e.includes('hdfcbank'))   return 'hdfc'
  if (e.includes('sbi'))        return 'sbi'
  if (e.includes('icicibank'))  return 'icici'
  if (e.includes('axisbank'))   return 'axis'
  if (e.includes('kotak'))      return 'kotak'
  if (e.includes('indusind'))   return 'indusind'
  if (e.includes('yesbank'))    return 'yesbank'
  if (e.includes('paytm'))      return 'paytm'
  return 'unknown'
}

// ── PARSE MULTIPLE EMAILS ─────────────────────────────────────
/**
 * Parse multiple email bodies
 * @param {Array<{body: string, sender: string}>} emails
 * @returns {Array} Parsed transactions (non-null only)
 */
export function parseEmails(emails = []) {
  const results = []
  for (const email of emails) {
    const txn = parseEmail(email.body, email.sender)
    if (txn) results.push(txn)
  }

  // Remove obvious duplicates
  const seen = new Set()
  return results.filter(t => {
    const key = `${t.date}-${t.amount}-${t.merchant}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── KNOWN BANK EMAIL SENDERS ──────────────────────────────────
export const BANK_SENDERS = {
  hdfc:     ['statements@hdfcbank.com', 'alerts@hdfcbank.com', 'noreply@hdfcbank.com'],
  sbi:      ['noreply@sbi.co.in', 'noreply@sbicard.com', 'alerts@sbi.co.in'],
  icici:    ['alerts@icicibank.com', 'estatement@icicibank.com', 'noreply@icicibank.com'],
  axis:     ['alerts@axisbank.com', 'eStatement@axisbank.com'],
  kotak:    ['alerts@kotak.com', 'statement@kotak.com'],
  indusind: ['alerts@indusind.com'],
  yesbank:  ['alerts@yesbank.in'],
}

export const ALL_BANK_SENDERS = Object.values(BANK_SENDERS).flat()

// ── IS TRANSACTION EMAIL ──────────────────────────────────────
export function isTransactionEmail(subject = '', sender = '') {
  const s = subject.toLowerCase()
  const fromBank = ALL_BANK_SENDERS.some(b => sender.toLowerCase().includes(b.split('@')[1]))

  const txnKeywords = [
    'debited', 'credited', 'transaction', 'txn alert', 'payment',
    'statement', 'e-statement', 'account alert', 'upi', 'neft', 'imps'
  ]
  const hasTxnKeyword = txnKeywords.some(k => s.includes(k))

  return fromBank || hasTxnKeyword
}
