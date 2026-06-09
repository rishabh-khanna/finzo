const express = require('express')
const { google } = require('googleapis')
const router  = express.Router()

// ── OAUTH CLIENT ──────────────────────────────────────────────
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  )
}

// Scopes — read-only Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

// ── STEP 1: Start OAuth ───────────────────────────────────────
// Frontend calls: GET /auth/gmail?userId=<supabase_user_id>
router.get('/gmail', (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const oauth2Client = getOAuthClient()

  // Store userId in session so we know who to save tokens for
  req.session.userId = userId

  const authUrl = oauth2Client.generateAuthUrl({
    access_type:  'offline',   // gets refresh token
    scope:        SCOPES,
    prompt:       'consent',   // always show consent to get refresh token
    state:        userId,      // extra safety
  })

  res.json({ authUrl })
})

// ── STEP 2: Handle Google Callback ───────────────────────────
// Google redirects here after user approves
router.get('/gmail/callback', async (req, res) => {
  const { code, state: userId, error } = req.query

  // User denied access
  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/import?gmail=denied`)
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/import?gmail=error`)
  }

  try {
    const oauth2Client = getOAuthClient()

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user's Gmail address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: googleUser } = await oauth2.userinfo.get()

    // Save tokens to Supabase for this user
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

    // Store Gmail tokens against user
    await supabase
      .from('gmail_tokens')
      .upsert({
        user_id:       userId || req.session.userId,
        gmail_email:   googleUser.email,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date:   tokens.expiry_date,
      }, { onConflict: 'user_id' })

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/import?gmail=connected&email=${encodeURIComponent(googleUser.email)}`)

  } catch (err) {
    console.error('OAuth callback error:', err)
    res.redirect(`${process.env.FRONTEND_URL}/import?gmail=error`)
  }
})

// ── STEP 3: Check connection status ──────────────────────────
router.get('/gmail/status', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ connected: false })

  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

    const { data } = await supabase
      .from('gmail_tokens')
      .select('gmail_email, created_at')
      .eq('user_id', userId)
      .single()

    res.json({
      connected: !!data,
      email:     data?.gmail_email || null,
    })
  } catch {
    res.json({ connected: false, email: null })
  }
})

// ── DISCONNECT Gmail ──────────────────────────────────────────
router.delete('/gmail/disconnect', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  await supabase.from('gmail_tokens').delete().eq('user_id', userId)
  res.json({ success: true })
})

module.exports = router
