require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const session    = require('express-session')
const authRoutes = require('./routes/auth')
const gmailRoutes= require('./routes/gmail')

const app  = express()
const PORT = process.env.PORT || 3001

// ── CORS ──────────────────────────────────────────────────────
const corsOptions = {
  origin: function(origin, callback) {
    // Allow all origins for now (tighten after testing)
    callback(null, true)
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','x-user-id','Accept'],
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

// Handle ALL preflight OPTIONS requests — this fixes the 405 error
app.options('*', cors(corsOptions))

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

// Session for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'finzo-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
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
