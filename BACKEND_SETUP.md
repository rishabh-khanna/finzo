# Finzo Backend Setup — Gmail Integration

## Architecture
```
Frontend (Netlify) → Backend (Railway) → Gmail API → Supabase
```

---

## Step 1 — Deploy Backend on Railway (free, no card)

1. Go to **railway.app** → Sign up with GitHub (no card)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `finzo` repo
4. Railway auto-detects the `backend/` folder
5. Set **Root Directory** to `backend`
6. Add environment variables (Step 3 below)
7. Click **Deploy** → get your URL like `https://finzo-backend.up.railway.app`

---

## Step 2 — Google Cloud Setup (Gmail API)

1. Go to **console.cloud.google.com**
2. **New Project** → name `finzo` → Create
3. **APIs & Services** → **Library** → search `Gmail API` → Enable
4. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Authorized redirect URIs — add EXACTLY:
   ```
   https://your-railway-url.up.railway.app/auth/gmail/callback
   ```
7. Copy **Client ID** and **Client Secret**

---

## Step 3 — Backend Environment Variables (Railway)

In Railway → your service → Variables tab, add:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Console |
| `GOOGLE_CLIENT_SECRET` | From Google Console |
| `GMAIL_REDIRECT_URI` | `https://your-railway-url.up.railway.app/auth/gmail/callback` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → **service_role** key (NOT anon) |
| `FRONTEND_URL` | `https://your-netlify-app.netlify.app` |
| `SESSION_SECRET` | Any random string |
| `NODE_ENV` | `production` |

---

## Step 4 — Frontend Environment Variables (Netlify)

In Netlify → Site config → Environment variables, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_KEY` | Supabase **anon** key |
| `VITE_API_URL` | Your Railway backend URL |

---

## Step 5 — Supabase: Run Updated Schema

In Supabase → SQL Editor, run the full `supabase_schema.sql` file.
It now includes the `gmail_tokens` table for storing OAuth tokens.

---

## How Gmail Flow Works

```
1. User clicks "Connect Gmail" in Import page
2. Frontend calls GET /auth/gmail?userId=xxx on Railway backend
3. Backend generates Google OAuth URL and returns it
4. Frontend redirects user to Google OAuth consent screen
5. User approves → Google redirects to /auth/gmail/callback on Railway
6. Backend exchanges code for tokens → saves to Supabase gmail_tokens table
7. Backend redirects user back to Netlify /import?gmail=connected
8. Frontend shows "Gmail Connected ✅" + auto-scans inbox
9. User sees all bank emails found → selects which to import
10. Backend downloads PDFs → sends base64 to frontend
11. PDF.js parses PDF in browser (private)
12. Transactions saved to Supabase
```

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
# Fill in .env values
npm install
npm run dev
# Backend at http://localhost:3001

# Terminal 2 — Frontend
cd ..
echo "VITE_API_URL=http://localhost:3001" >> .env.local
npm install
npm run dev
# Frontend at http://localhost:5173
```
