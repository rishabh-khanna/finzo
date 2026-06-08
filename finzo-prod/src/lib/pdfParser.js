/**
 * Finzo — PDF Statement Parser
 * Uses PDF.js (Mozilla) — runs 100% in browser, no server needed
 * Supports password-protected PDFs
 * Handles: HDFC, SBI, ICICI, Axis, Kotak, IndusInd
 */
import * as pdfjsLib from 'pdfjs-dist'
import { categorize, cleanMerchant, merchantFromUPI } from './merchantRules.js'

// PDF.js worker — must point to the worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// ── BANK PASSWORD PATTERNS ────────────────────────────────────
export const BANK_PASSWORD_PATTERNS = {
  hdfc:     { label: 'Name (first 4 uppercase) + Last 4 digits', example: 'RAHUL5678' },
  sbi:      { label: 'Date of Birth (DDMMYYYY)',                  example: '01011990' },
  icici:    { label: 'Lowercase first name + Last 4 digits',      example: 'rahul5678' },
  axis:     { label: 'First 4 chars of PAN (uppercase)',          example: 'ABCP' },
  kotak:    { label: 'Date of Birth (DDMMYYYY)',                  example: '01011990' },
  indusind: { label: 'Date of Birth (DDMMYYYY)',                  example: '01011990' },
  yesbank:  { label: 'Date of Birth (DDMMYYYY)',                  example: '01011990' },
  bob:      { label: 'Account number last 4 + DOB (DDMMYYYY)',    example: '567801011990' },
}

// ── DETECT BANK FROM FILENAME OR CONTENT ──────────────────────
export function detectBank(filename = '', content = '') {
  const f = filename.toLowerCase()
  const c = content.toLowerCase()

  if (f.includes('hdfc')    || c.includes('hdfc bank'))         return 'hdfc'
  if (f.includes('sbi')     || c.includes('state bank'))        return 'sbi'
  if (f.includes('icici')   || c.includes('icici bank'))        return 'icici'
  if (f.includes('axis')    || c.includes('axis bank'))         return 'axis'
  if (f.includes('kotak')   || c.includes('kotak mahindra'))    return 'kotak'
  if (f.includes('indusind')|| c.includes('indusind bank'))     return 'indusind'
  if (f.includes('yes')     || c.includes('yes bank'))          return 'yesbank'
  if (f.includes('bob')     || c.includes('bank of baroda'))    return 'bob'
  if (f.includes('canara')  || c.includes('canara bank'))       return 'canara'
  if (f.includes('pnb')     || c.includes('punjab national'))   return 'pnb'

  return 'unknown'
}

// ── DETECT ACCOUNT TYPE ───────────────────────────────────────
export function detectAccountType(content = '') {
  const c = content.toLowerCase()
  if (c.includes('credit card') || c.includes('card statement')) return 'credit_card'
  if (c.includes('savings account') || c.includes('current account')) return 'debit_card'
  return 'unknown'
}

// ── LOAD & DECRYPT PDF ────────────────────────────────────────
/**
 * Load a PDF file and extract all text
 * @param {File} file - The PDF File object
 * @param {string} password - Optional password for encrypted PDFs
 * @returns {Promise<{pages: string[], text: string, pageCount: number}>}
 */
export async function loadPDF(file, password = '') {
  const arrayBuffer = await file.arrayBuffer()

  const loadConfig = {
    data: arrayBuffer,
    ...(password ? { password } : {})
  }

  const pdf = await pdfjsLib.getDocument(loadConfig).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page  = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text  = content.items.map(item => item.str).join(' ')
    pages.push(text)
  }

  const fullText = pages.join('\n')

  return {
    pages,
    text: fullText,
    pageCount: pdf.numPages
  }
}

// ── STATEMENT DATE PARSER ────────────────────────────────────
function parseDate(str = '') {
  // Handles: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, MMM DD YYYY
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/,   // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/,     // DD-MM-YYYY
    /(\d{2})\s+(\w{3})\s+(\d{4})/, // DD MMM YYYY
  ]
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }

  for (const fmt of formats) {
    const m = str.match(fmt)
    if (m) {
      if (isNaN(Number(m[2]))) {
        // MMM format
        const month = MONTHS[m[2].toLowerCase()]
        if (month) return new Date(Number(m[3]), month - 1, Number(m[1]))
      } else {
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
      }
    }
  }
  return null
}

// ── AMOUNT PARSER ─────────────────────────────────────────────
function parseAmount(str = '') {
  const cleaned = str.replace(/[₹,\s]/g, '').replace(/[()]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.abs(num)
}

// ── HDFC CREDIT CARD PARSER ───────────────────────────────────
function parseHDFCCredit(text) {
  const txns = []
  // HDFC CC format: DD/MM/YYYY Description Amount Dr/Cr
  const lineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+(Cr|Dr)/gi

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    const [, dateStr, desc, amtStr, drCr] = match
    const date   = parseDate(dateStr)
    const amount = parseAmount(amtStr)
    const type   = drCr.toLowerCase() === 'cr' ? 'credit' : 'debit'
    const merchant = cleanMerchant(desc)
    const upiMatch = desc.match(/UPI[/-]([^\s/]+@[^\s/]+)/i)

    txns.push({
      date:        date ? date.toISOString().split('T')[0] : dateStr,
      description: desc.trim(),
      merchant,
      amount,
      type,
      category:    categorize(desc, merchant),
      upiId:       upiMatch ? upiMatch[1] : null,
      source:      'cc_statement',
      accountType: 'credit_card',
      bank:        'hdfc',
      rawDesc:     desc.trim(),
    })
  }
  return txns
}

// ── SBI PARSER ────────────────────────────────────────────────
function parseSBI(text) {
  const txns = []
  // SBI format: DD MMM YYYY Description Debit Credit Balance
  const lineRegex = /(\d{2}\s+\w{3}\s+\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})/gi

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    const [, dateStr, desc, debit, credit] = match
    const date   = parseDate(dateStr)
    const amount = parseAmount(debit || credit || '0')
    const type   = credit && !debit ? 'credit' : 'debit'
    const merchant = cleanMerchant(desc)
    const upiMatch = desc.match(/UPI[/-]([^\s/]+@[^\s/]+)/i)

    if (amount === 0) continue

    txns.push({
      date:        date ? date.toISOString().split('T')[0] : dateStr,
      description: desc.trim(),
      merchant,
      amount,
      type,
      category:    categorize(desc, merchant),
      upiId:       upiMatch ? upiMatch[1] : null,
      source:      'debit_statement',
      accountType: 'debit_card',
      bank:        'sbi',
      rawDesc:     desc.trim(),
    })
  }
  return txns
}

// ── ICICI PARSER ─────────────────────────────────────────────
function parseICICI(text) {
  const txns = []
  const lineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})?/gi

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    const [, dateStr, desc, amt1, amt2] = match
    const date   = parseDate(dateStr)
    const amount = parseAmount(amt1)
    // ICICI puts Cr suffix for credits
    const type   = desc.includes('Cr') || (amt2 && !amt1.includes('Dr')) ? 'credit' : 'debit'
    const merchant = cleanMerchant(desc)

    if (amount === 0) continue

    txns.push({
      date:        date ? date.toISOString().split('T')[0] : dateStr,
      description: desc.trim(),
      merchant,
      amount,
      type,
      category:    categorize(desc, merchant),
      upiId:       null,
      source:      'cc_statement',
      accountType: 'credit_card',
      bank:        'icici',
      rawDesc:     desc.trim(),
    })
  }
  return txns
}

// ── GENERIC FALLBACK PARSER ───────────────────────────────────
function parseGeneric(text) {
  const txns = []
  const lines = text.split('\n').filter(l => l.trim().length > 10)

  for (const line of lines) {
    // Must contain a date and an amount
    const dateMatch = line.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{2}\s+\w{3}\s+\d{4}/)
    const amtMatch  = line.match(/([\d,]+\.\d{2})/)
    if (!dateMatch || !amtMatch) continue

    const date   = parseDate(dateMatch[0])
    const amount = parseAmount(amtMatch[1])
    if (amount === 0 || amount > 10000000) continue // sanity check

    // Guess debit/credit
    const upper = line.toUpperCase()
    const type  = upper.includes('CR') || upper.includes('CREDIT') ? 'credit' : 'debit'

    // Extract description (between date and amount)
    const desc = line
      .replace(dateMatch[0], '')
      .replace(amtMatch[0], '')
      .replace(/\b(CR|DR|DEBIT|CREDIT)\b/gi, '')
      .trim()

    const merchant = cleanMerchant(desc)
    const upiMatch = line.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z]+)/i)

    txns.push({
      date:        date ? date.toISOString().split('T')[0] : dateMatch[0],
      description: desc,
      merchant,
      amount,
      type,
      category:    categorize(desc, merchant),
      upiId:       upiMatch ? upiMatch[1] : null,
      source:      'statement',
      accountType: 'unknown',
      bank:        'unknown',
      rawDesc:     line.trim(),
    })
  }

  return txns
}

// ── MAIN PARSE FUNCTION ───────────────────────────────────────
/**
 * Parse transactions from extracted PDF text
 * @param {string} text - Full PDF text content
 * @param {string} bank - Bank identifier
 * @returns {Object} { transactions, meta }
 */
export function parseStatement(text, bank) {
  let txns = []

  switch (bank) {
    case 'hdfc':  txns = parseHDFCCredit(text); break
    case 'sbi':   txns = parseSBI(text);         break
    case 'icici': txns = parseICICI(text);       break
    default:      txns = parseGeneric(text);     break
  }

  // Deduplicate
  const seen = new Set()
  txns = txns.filter(t => {
    const key = `${t.date}-${t.amount}-${t.description?.slice(0,20)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Extract month/year from transactions
  const dates = txns.map(t => new Date(t.date)).filter(d => !isNaN(d))
  const month = dates.length ? dates[0].getMonth() + 1 : new Date().getMonth() + 1
  const year  = dates.length ? dates[0].getFullYear() : new Date().getFullYear()

  const debits  = txns.filter(t => t.type === 'debit')
  const credits = txns.filter(t => t.type === 'credit')

  return {
    transactions: txns,
    meta: {
      bank,
      month,
      year,
      totalDebit:  debits.reduce((s, t) => s + t.amount, 0),
      totalCredit: credits.reduce((s, t) => s + t.amount, 0),
      txnCount:    txns.length,
      accountType: detectAccountType(text),
    }
  }
}

// ── FULL PIPELINE: FILE → TRANSACTIONS ───────────────────────
/**
 * Complete pipeline: PDF file → parsed transactions
 * @param {File} file
 * @param {string} password
 * @param {Function} onProgress - (step: string, pct: number) => void
 */
export async function processPDF(file, password = '', onProgress = () => {}) {
  onProgress('Decrypting PDF...', 10)
  const { text, pageCount } = await loadPDF(file, password)

  onProgress('Detecting bank...', 25)
  const bank = detectBank(file.name, text)

  onProgress('Extracting transactions...', 45)
  const { transactions: txns, meta } = parseStatement(text, bank)

  onProgress('Categorizing...', 75)
  // Already categorized during parsing — this step is for future AI enrichment

  onProgress('Running anomaly detection...', 90)
  const withAnomalies = detectAnomalies(txns)

  onProgress('Done!', 100)

  return {
    transactions: withAnomalies,
    meta: { ...meta, filename: file.name, pageCount },
  }
}

// ── ANOMALY DETECTION ─────────────────────────────────────────
/**
 * Flag suspicious transactions based on rules
 */
export function detectAnomalies(txns = []) {
  // Calculate average debit amount
  const debits = txns.filter(t => t.type === 'debit').map(t => t.amount)
  const avg = debits.length ? debits.reduce((s, a) => s + a, 0) / debits.length : 0
  const stdDev = Math.sqrt(debits.map(a => Math.pow(a - avg, 2)).reduce((s, v) => s + v, 0) / debits.length)

  return txns.map(t => {
    let anomaly = false
    let anomalyReason = ''

    // Rule 1: Unknown merchant with large amount (3+ std devs above avg)
    if (t.type === 'debit' && t.category === 'other' && t.amount > avg + (3 * stdDev)) {
      anomaly = true
      anomalyReason = 'Large amount from unknown merchant'
    }

    // Rule 2: Duplicate transaction (same amount + merchant on same day)
    // (handled separately after calling this function)

    return { ...t, anomaly, anomalyReason }
  })
}
