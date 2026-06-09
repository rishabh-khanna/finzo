require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const session    = require('express-session')
const authRoutes = require('./routes/auth')
const gmailRoutes= require('./routes/gmail')

const app  = express()
const PORT = process.env.PORT || 3001

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

// CORS — allow your Netlify frontend
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.netlify\.app$/,
    /\.github\.io$/,
  ],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-user-id'],
}))

// Session for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'finzo-session-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutes — just for OAuth flow
  }
}))

// ── ROUTES ────────────────────────────────────────────────────
app.use('/auth',  authRoutes)
app.use('/api',   gmailRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'finzo-backend', time: new Date().toISOString() })
})

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Finzo backend running on port ${PORT}`)
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`)
})

module.exports = app
