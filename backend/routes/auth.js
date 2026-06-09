const express = require('express')
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')
const router  = express.Router()

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  )
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

// ── STEP 1: Start OAuth ───────────────────────────────────────
router.get('/gmail', (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const oauth2Client = getOAuthClient()

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope:       SCOPES,
    prompt:      'consent',
    state:       userId,  // pass userId through OAuth state param
  })

  // Return authUrl as JSON — frontend handles the redirect
  res.json({ authUrl })
})

// ── STEP 2: Handle Google Callback ───────────────────────────
router.get('/gmail/callback', async (req, res) => {
  const { code, state: userId, error } = req.query

  console.log('OAuth callback received. userId from state:', userId)
  console.log('Code received:', !!code)

  if (error) {
    console.error('OAuth error:', error)
    return res.redirect(`${process.env.FRONTEND_URL}/import?gmail=denied`)
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/import?gmail=error&reason=no_code`)
  }

  if (!userId) {
    console.error('No userId in state parameter')
    return res.redirect(`${process.env.FRONTEND_URL}/import?gmail=error&reason=no_user`)
  }

  try {
    const oauth2Client = getOAuthClient()

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    console.log('Tokens received. Has refresh_token:', !!tokens.refresh_token)
    oauth2Client.setCredentials(tokens)

    // Get Gmail address
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: googleUser } = await oauth2Api.userinfo.get()
    console.log('Gmail email:', googleUser.email)

    // Save tokens to Supabase using service key
    const supabase = getSupabase()

    const { error: dbError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id:       userId,
        gmail_email:   googleUser.email,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expiry_date:   tokens.expiry_date || null,
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Supabase upsert error:', JSON.stringify(dbError))
      // Still redirect — we'll show the error on frontend
      return res.redirect(`${process.env.FRONTEND_URL}/import?gmail=error&reason=db_save_failed`)
    }

    console.log('Tokens saved successfully for user:', userId)

    // Success — redirect to frontend
    res.redirect(
      `${process.env.FRONTEND_URL}/import?gmail=connected&email=${encodeURIComponent(googleUser.email)}`
    )

  } catch (err) {
    console.error('OAuth callback exception:', err.message)
    res.redirect(`${process.env.FRONTEND_URL}/import?gmail=error&reason=${encodeURIComponent(err.message)}`)
  }
})

// ── Check connection status ───────────────────────────────────
router.get('/gmail/status', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ connected: false })

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('gmail_tokens')
      .select('gmail_email, created_at')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.log('Status check - no token found for user:', userId, error.code)
      return res.json({ connected: false, email: null })
    }

    res.json({ connected: !!data, email: data?.gmail_email || null })
  } catch (err) {
    console.error('Status check error:', err.message)
    res.json({ connected: false, email: null })
  }
})

// ── Disconnect Gmail ──────────────────────────────────────────
router.delete('/gmail/disconnect', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = getSupabase()
  await supabase.from('gmail_tokens').delete().eq('user_id', userId)
  res.json({ success: true })
})

module.exports = router
