/**
 * Finzo — PDF Statement Parser
 * PDF.js runs 100% in browser — private, no upload
 * Handles: HDFC CC, HDFC Savings, SBI, ICICI, Axis, Kotak,
 *           Standard Chartered, FIRST/AU/Kotak CC, Generic
 */
import * as pdfjsLib from 'pdfjs-dist'
import { categorize, cleanMerchant } from './merchantRules.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// ── BANK PASSWORD PATTERNS ────────────────────────────────────
export const BANK_PASSWORD_PATTERNS = {
  hdfc:     { label:'Name (first 4 uppercase) + Last 4 digits of card/account', example:'RISH5678' },
  sbi:      { label:'Date of Birth (DDMMYYYY)', example:'01011990' },
  icici:    { label:'Lowercase first name + Last 4 digits', example:'rish5678' },
  axis:     { label:'First 4 chars of PAN (uppercase)', example:'ABCP' },
  kotak:    { label:'Date of Birth (DDMMYYYY)', example:'01011990' },
  indusind: { label:'Date of Birth (DDMMYYYY)', example:'01011990' },
  sc:       { label:'Date of Birth (DDMMYYYY)', example:'01011990' },
  first:    { label:'Date of Birth (DDMMYYYY)', example:'01011990' },
  au:       { label:'Date of Birth (DDMMYYYY)', example:'01011990' },
}

export function detectBank(filename = '', content = '') {
  const f = filename.toLowerCase()
  const c = content.toLowerCase().slice(0, 2000)
  if (f.includes('hdfc')     || c.includes('hdfc bank'))           return 'hdfc'
  if (f.includes('sbi')      || c.includes('state bank'))          return 'sbi'
  if (f.includes('icici')    || c.includes('icici bank'))          return 'icici'
  if (f.includes('axis')     || c.includes('axis bank'))           return 'axis'
  if (f.includes('kotak')    || c.includes('kotak mahindra'))      return 'kotak'
  if (f.includes('sc')       || c.includes('standard chartered'))  return 'sc'
  if (f.includes('first')    || c.includes('first millennia') || c.includes('au small')) return 'first'
  if (f.includes('indusind') || c.includes('indusind'))            return 'indusind'
  if (f.includes('yes')      || c.includes('yes bank'))            return 'yesbank'
  if (f.includes('bob')      || c.includes('bank of baroda'))      return 'bob'
  if (f.includes('stanchart')) return 'sc'
  return 'unknown'
}

export function detectAccountType(content = '') {
  const c = content.toLowerCase()
  if (c.includes('credit card') || c.includes('card statement') || c.includes('card account')) return 'credit_card'
  if (c.includes('savings') || c.includes('current account') || c.includes('salary account')) return 'debit_card'
  return 'unknown'
}

// ── LOAD PDF ──────────────────────────────────────────────────
export async function loadPDF(file, password = '') {
  const arrayBuffer = await file.arrayBuffer()
  const loadConfig  = { data: arrayBuffer, ...(password ? { password } : {}) }
  const pdf         = await pdfjsLib.getDocument(loadConfig).promise
  const pages       = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Get items with their positions for better parsing
    const items   = content.items.map(item => ({
      str: item.str,
      x:   Math.round(item.transform[4]),
      y:   Math.round(item.transform[5]),
    }))
    pages.push(items)
  }

  return {
    pages,
    text:      pages.map(p => p.map(i => i.str).join(' ')).join('\n'),
    pageCount: pdf.numPages,
  }
}

// ── DATE PARSER ───────────────────────────────────────────────
function parseDate(str = '') {
  if (!str) return null
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }

  // DD/MM/YYYY or DD-MM-YYYY
  let m = str.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`

  // DD MMM YYYY or DD-MMM-YYYY
  m = str.match(/(\d{1,2})[\s\-]+([A-Za-z]{3})[\s\-]+(\d{4})/)
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()]
    if (mon) return `${m[3]}-${String(mon).padStart(2,'0')}-${m[1].padStart(2,'0')}`
  }

  // YYYY-MM-DD
  m = str.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return m[0]

  return null
}

function parseAmount(str = '') {
  const n = parseFloat(str.replace(/[₹,\s()]/g, ''))
  return isNaN(n) ? 0 : Math.abs(n)
}

// ── UNIVERSAL LINE-BASED PARSER ───────────────────────────────
// Works on most Indian bank statements by detecting date + amount patterns
function parseUniversal(text, bank, accountType) {
  const txns = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5)

  // Pattern: line containing a date + at least one amount
  const DATE_PAT   = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{2}[\s\-][A-Za-z]{3}[\s\-]\d{4})\b/
  const AMOUNT_PAT = /(?:₹|Rs\.?)?\s*([\d,]+\.\d{2})/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const dateMatch = line.match(DATE_PAT)
    if (!dateMatch) continue

    const dateStr = parseDate(dateMatch[1])
    if (!dateStr) continue

    // Find all amounts in this line (and next 1-2 lines)
    const combined = line + ' ' + (lines[i+1]||'') + ' ' + (lines[i+2]||'')
    const amounts  = []
    let am
    const amPat = /(?:₹|Rs\.?)?\s*([\d,]+\.\d{2})/g
    while ((am = amPat.exec(combined)) !== null) {
      const v = parseAmount(am[1])
      if (v > 0 && v < 50000000) amounts.push(v)
    }

    if (amounts.length === 0) continue

    // Extract description (text between date and first amount)
    const afterDate = line.replace(dateMatch[0], '').trim()
    const desc      = afterDate.replace(/[\d,]+\.\d{2}/g, '').replace(/[₹CrDr]/g, '').trim()
    if (desc.length < 2) continue

    // Determine type
    const lower  = combined.toLowerCase()
    const isCr   = /\bcr\b|credit|credited|\+/.test(lower) && !/\bdr\b/.test(lower)
    const type   = isCr ? 'credit' : 'debit'
    const amount = amounts[0]

    // UPI ID detection
    const upiMatch = combined.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z]{2,})/i)
    const upiId    = upiMatch ? upiMatch[1] : null

    const merchant  = cleanMerchant(desc)
    const date      = new Date(dateStr)

    txns.push({
      date:        dateStr,
      description: desc,
      merchant,
      amount,
      type,
      category:    categorize(desc, merchant),
      upi_id:      upiId,
      source:      accountType === 'credit_card' ? 'cc_statement' : 'debit_statement',
      account_type: accountType,
      bank,
      anomaly:     false,
      month:       date.getMonth() + 1,
      year:        date.getFullYear(),
      rawDesc:     desc,
    })
  }

  return txns
}

// ── HDFC CC SPECIFIC PARSER ───────────────────────────────────
function parseHDFCCC(text) {
  const txns  = []
  // HDFC CC: DD/MM/YYYY Description Amount(Cr/Dr)
  const regex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Cr|Dr)?/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    const dateStr = parseDate(m[1])
    if (!dateStr) continue
    const amount  = parseAmount(m[3])
    if (amount === 0) continue
    const type    = m[4]?.toLowerCase() === 'cr' ? 'credit' : 'debit'
    const desc    = m[2].trim()
    const merchant= cleanMerchant(desc)
    const upiM    = desc.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z]{2,})/i)
    const date    = new Date(dateStr)
    txns.push({
      date: dateStr, description: desc, merchant, amount, type,
      category: categorize(desc, merchant),
      upi_id: upiM?.[1] || null,
      source: 'cc_statement', account_type: 'credit_card', bank: 'hdfc',
      anomaly: false, month: date.getMonth()+1, year: date.getFullYear()
    })
  }
  return txns
}

// ── ANOMALY DETECTION ─────────────────────────────────────────
function detectAnomalies(txns) {
  const debits = txns.filter(t => t.type === 'debit').map(t => t.amount)
  if (debits.length < 3) return txns
  const avg    = debits.reduce((s,a) => s+a, 0) / debits.length
  const std    = Math.sqrt(debits.map(a => Math.pow(a-avg,2)).reduce((s,v) => s+v, 0) / debits.length)

  return txns.map(t => {
    const anomaly = t.type === 'debit' &&
      t.category === 'other' &&
      t.amount > avg + (3 * std) &&
      t.amount > 5000
    return { ...t, anomaly, anomalyReason: anomaly ? 'Unusually large amount from unknown merchant' : '' }
  })
}

// ── MAIN PIPELINE ─────────────────────────────────────────────
export async function processPDF(file, password = '', onProgress = () => {}) {
  onProgress('Loading PDF...', 10)
  const { text, pages, pageCount } = await loadPDF(file, password)

  onProgress('Detecting bank...', 20)
  const bank        = detectBank(file.name, text)
  const accountType = detectAccountType(text)

  onProgress('Extracting transactions...', 40)
  let txns = []

  // Try bank-specific parser first, fall back to universal
  if (bank === 'hdfc' && accountType === 'credit_card') {
    txns = parseHDFCCC(text)
  }

  // If specific parser got < 3 results, try universal
  if (txns.length < 3) {
    const universal = parseUniversal(text, bank, accountType)
    if (universal.length > txns.length) txns = universal
  }

  onProgress('Cleaning merchant names...', 60)
  onProgress('Categorizing transactions...', 75)
  onProgress('Running anomaly detection...', 88)

  txns = detectAnomalies(txns)

  // Deduplicate
  const seen = new Set()
  txns = txns.filter(t => {
    const key = `${t.date}-${t.amount}-${t.description?.slice(0,15)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  onProgress('Done!', 100)

  const dates  = txns.map(t => new Date(t.date)).filter(d => !isNaN(d))
  const month  = dates.length ? dates[0].getMonth() + 1 : new Date().getMonth() + 1
  const year   = dates.length ? dates[0].getFullYear()  : new Date().getFullYear()
  const debits = txns.filter(t => t.type === 'debit')
  const credits= txns.filter(t => t.type === 'credit')

  return {
    transactions: txns,
    meta: {
      bank, accountType, month, year,
      totalDebit:  debits.reduce((s,t) => s+t.amount, 0),
      totalCredit: credits.reduce((s,t) => s+t.amount, 0),
      txnCount:    txns.length,
      filename:    file.name,
      pageCount,
    }
  }
}
