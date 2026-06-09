const express = require('express')
const router  = express.Router()
const { scanBankEmails, downloadAttachment } = require('../services/gmailService')
const { parseEmailsToTransactions } = require('../services/emailParser')

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
function requireUser(req, res, next) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'x-user-id header required' })
  req.userId = userId
  next()
}

// ── SCAN INBOX ────────────────────────────────────────────────
// Returns list of bank statement emails + alert emails found
// GET /api/gmail/scan
router.get('/gmail/scan', requireUser, async (req, res) => {
  try {
    console.log(`Scanning Gmail for user: ${req.userId}`)
    const result = await scanBankEmails(req.userId)

    res.json({
      success:    true,
      statements: result.statements,
      alerts:     result.alerts,
      total:      result.statements.length + result.alerts.length,
    })
  } catch (err) {
    console.error('Gmail scan error:', err)

    if (err.message.includes('Gmail not connected')) {
      return res.status(403).json({ error: 'Gmail not connected', code: 'NOT_CONNECTED' })
    }
    if (err.code === 401) {
      return res.status(401).json({ error: 'Gmail token expired', code: 'TOKEN_EXPIRED' })
    }

    res.status(500).json({ error: err.message })
  }
})

// ── DOWNLOAD PDF ATTACHMENT ───────────────────────────────────
// Returns base64 encoded PDF for frontend to parse with PDF.js
// POST /api/gmail/attachment
router.post('/gmail/attachment', requireUser, async (req, res) => {
  const { messageId, attachmentId, filename } = req.body

  if (!messageId || !attachmentId) {
    return res.status(400).json({ error: 'messageId and attachmentId required' })
  }

  try {
    const pdfBuffer = await downloadAttachment(req.userId, messageId, attachmentId)

    res.json({
      success:  true,
      filename: filename || 'statement.pdf',
      data:     pdfBuffer.toString('base64'),
      size:     pdfBuffer.length,
    })
  } catch (err) {
    console.error('Attachment download error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── PARSE ALERT EMAILS ────────────────────────────────────────
// Parses UPI/CC alert email bodies into transactions
// POST /api/gmail/parse-alerts
router.post('/gmail/parse-alerts', requireUser, async (req, res) => {
  const { alerts } = req.body  // array of { bodyText, sender, subject, date }

  if (!alerts?.length) {
    return res.status(400).json({ error: 'alerts array required' })
  }

  try {
    const transactions = parseEmailsToTransactions(alerts)
    res.json({
      success:      true,
      transactions,
      parsed:       transactions.length,
      total:        alerts.length,
    })
  } catch (err) {
    console.error('Parse alerts error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
