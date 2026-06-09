const { google }     = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

// All known Indian bank email senders
const BANK_SENDERS = [
  // HDFC
  'statements@hdfcbank.com', 'alerts@hdfcbank.com', 'noreply@hdfcbank.com',
  'creditcard@hdfcbank.com', 'hdfcbanksmarthub@hdfcbank.com',
  // SBI
  'noreply@sbi.co.in', 'noreply@sbicard.com', 'alerts@sbi.co.in', 'sbicardstatement@sbi.co.in',
  // ICICI
  'alerts@icicibank.com', 'estatement@icicibank.com', 'noreply@icicibank.com',
  // Axis
  'alerts@axisbank.com', 'eStatement@axisbank.com', 'noreply@axisbank.com',
  // Kotak
  'alerts@kotak.com', 'statement@kotak.com', 'noreply@kotak.com',
  // IndusInd
  'alerts@indusind.com', 'noreply@indusind.com',
  // Yes Bank
  'alerts@yesbank.in', 'noreply@yesbank.in',
  // Bank of Baroda
  'alerts@bankofbaroda.com',
  // Canara
  'alerts@canarabank.com',
  // PNB
  'alerts@pnb.co.in',
  // Paytm
  'noreply@paytmbank.com',
  // Razorpay / payment gateways that send alerts
  'alerts@razorpay.com',
]

// Gmail search query to find ALL bank emails
const BANK_GMAIL_QUERY = `(
  from:(statements@hdfcbank.com OR alerts@hdfcbank.com OR noreply@sbicard.com OR
        alerts@sbi.co.in OR alerts@icicibank.com OR estatement@icicibank.com OR
        alerts@axisbank.com OR eStatement@axisbank.com OR alerts@kotak.com OR
        alerts@indusind.com OR alerts@yesbank.in OR alerts@bankofbaroda.com OR
        alerts@canarabank.com OR alerts@pnb.co.in OR noreply@paytmbank.com)
  OR subject:(e-statement OR "account statement" OR "credit card statement" OR
              "debit card statement" OR "UPI transaction" OR "debited" OR 
              "credited" OR "transaction alert" OR "payment" OR "CAS report")
)`

// ── GET OAUTH CLIENT WITH USER TOKENS ─────────────────────────
async function getAuthClientForUser(userId) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data: tokenData, error } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData) {
    throw new Error('Gmail not connected. Please connect Gmail first.')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date:   tokenData.expiry_date,
  })

  // Auto-refresh token if expired
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from('gmail_tokens')
        .update({
          access_token: tokens.access_token,
          expiry_date:  tokens.expiry_date,
        })
        .eq('user_id', userId)
    }
  })

  return oauth2Client
}

// ── SCAN INBOX FOR BANK EMAILS ────────────────────────────────
async function scanBankEmails(userId) {
  const auth    = await getAuthClientForUser(userId)
  const gmail   = google.gmail({ version: 'v1', auth })

  // Search Gmail
  const { data } = await gmail.users.messages.list({
    userId:   'me',
    q:        BANK_GMAIL_QUERY,
    maxResults: 500,
  })

  if (!data.messages?.length) {
    return { statements: [], alerts: [] }
  }

  const statements = []
  const alerts     = []

  // Process each email
  for (const msg of data.messages) {
    try {
      const { data: full } = await gmail.users.messages.get({
        userId: 'me',
        id:     msg.id,
        format: 'full',
      })

      const email = parseEmailMetadata(full)

      // Has PDF attachment → it's a statement
      if (email.hasPDF) {
        statements.push({
          ...email,
          messageId: msg.id,
        })
      } else {
        // No attachment → it's a transaction alert email
        alerts.push({
          ...email,
          messageId: msg.id,
        })
      }
    } catch (err) {
      console.error(`Error processing message ${msg.id}:`, err.message)
    }
  }

  return { statements, alerts }
}

// ── PARSE EMAIL METADATA ──────────────────────────────────────
function parseEmailMetadata(fullMessage) {
  const headers  = fullMessage.payload?.headers || []
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  const subject  = getHeader('Subject')
  const from     = getHeader('From')
  const date     = getHeader('Date')
  const sender   = from.match(/<(.+?)>$/)?.[1] || from

  // Detect bank from sender
  const bank = detectBankFromSender(sender)

  // Check for PDF attachments
  const parts    = getAllParts(fullMessage.payload)
  const pdfParts = parts.filter(p =>
    p.mimeType === 'application/pdf' ||
    p.filename?.toLowerCase().endsWith('.pdf')
  )

  // Extract email body text
  const bodyPart  = parts.find(p => p.mimeType === 'text/plain')
  const bodyText  = bodyPart?.body?.data
    ? Buffer.from(bodyPart.body.data, 'base64').toString('utf8')
    : ''

  // Calculate size
  const sizeKB = Math.round((fullMessage.sizeEstimate || 0) / 1024)

  return {
    subject,
    sender,
    from,
    date,
    bank,
    hasPDF:       pdfParts.length > 0,
    attachments:  pdfParts.map(p => ({
      filename:   p.filename,
      attachmentId: p.body?.attachmentId,
      size:       Math.round((p.body?.size || 0) / 1024) + ' KB',
      mimeType:   p.mimeType,
    })),
    bodyText:     bodyText.slice(0, 2000), // first 2000 chars
    sizeKB,
  }
}

// ── GET ALL PARTS (recursive) ─────────────────────────────────
function getAllParts(payload, parts = []) {
  if (!payload) return parts
  if (payload.body?.data || payload.body?.attachmentId) {
    parts.push(payload)
  }
  if (payload.parts) {
    payload.parts.forEach(p => getAllParts(p, parts))
  }
  return parts
}

// ── DOWNLOAD PDF ATTACHMENT ───────────────────────────────────
async function downloadAttachment(userId, messageId, attachmentId) {
  const auth  = await getAuthClientForUser(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  const { data } = await gmail.users.messages.attachments.get({
    userId:       'me',
    messageId,
    id:           attachmentId,
  })

  // data.data is base64url encoded PDF
  return Buffer.from(data.data, 'base64')
}

// ── DETECT BANK FROM SENDER ───────────────────────────────────
function detectBankFromSender(email = '') {
  const e = email.toLowerCase()
  if (e.includes('hdfcbank'))    return 'hdfc'
  if (e.includes('sbicard') || e.includes('sbi.co')) return 'sbi'
  if (e.includes('icicibank'))   return 'icici'
  if (e.includes('axisbank'))    return 'axis'
  if (e.includes('kotak'))       return 'kotak'
  if (e.includes('indusind'))    return 'indusind'
  if (e.includes('yesbank'))     return 'yesbank'
  if (e.includes('bankofbaroda'))return 'bob'
  if (e.includes('canarabank'))  return 'canara'
  if (e.includes('pnb'))         return 'pnb'
  if (e.includes('paytmbank'))   return 'paytm'
  return 'unknown'
}

module.exports = {
  scanBankEmails,
  downloadAttachment,
  detectBankFromSender,
}
