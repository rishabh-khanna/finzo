# Finzo — Your Complete Financial OS

AI-powered bank statement analyzer with investments, net worth tracking, and smart insights.

---

## 💰 Total Cost: ₹0/month Forever

| Layer | Tool | Cost | Card? |
|---|---|---|---|
| Frontend | React + Vite | ₹0 | ❌ No |
| Hosting | GitHub Pages | ₹0 | ❌ No |
| Database + Auth | Supabase | ₹0 | ❌ No |
| PDF Parsing | PDF.js (browser) | ₹0 | ❌ No |
| Anti-pause | UptimeRobot | ₹0 | ❌ No |

---

## 🚀 Deployment — 3 Steps, ~15 Minutes

---

### Step 1 — Supabase (Database + Auth)

**No credit card required. Never expires.**

1. Go to **[supabase.com](https://supabase.com)** → Sign up with GitHub
2. Click **New Project** → name it `finzo` → set a strong DB password → **Create Project**
3. Wait ~2 minutes for it to start
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Open `supabase_schema.sql` from this folder → copy all contents → paste → click **Run**
6. Go to **Settings → API** → copy two values:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public** key → long string starting with `eyJ...`
7. Save these — you'll need them in Step 2

---

### Step 2 — GitHub Pages (Frontend Hosting)

1. Go to **[github.dev/Rishabh-Khanna/finzo](https://github.dev/Rishabh-Khanna/finzo)** in Chrome
2. Upload all files from this unzipped folder (drag & drop into the Explorer panel)
3. Click **Source Control** icon → type `Initial commit` → click **✓ Commit & Push**
4. Go to your repo on GitHub → **Settings → Secrets and variables → Actions → New repository secret**
   - Add secret: `VITE_SUPABASE_URL` = your Supabase Project URL
   - Add secret: `VITE_SUPABASE_KEY` = your Supabase anon public key
5. Go to **Settings → Pages** → Source → **GitHub Actions** → Save
6. Go to **Actions** tab → your deploy workflow runs automatically

**Your live URL:**
```
https://rishabh-khanna.github.io/finzo
```

---

### Step 3 — UptimeRobot (Keeps Supabase Awake)

Supabase free tier pauses after 7 days of no activity. This prevents that.

1. Go to **[uptimerobot.com](https://uptimerobot.com)** → free signup (no card)
2. Click **Add New Monitor**
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Finzo Supabase`
   - URL: your Supabase Project URL (from Step 1)
   - Monitoring Interval: **Every 5 days**
3. Click **Create Monitor**

Done — Supabase stays alive forever, free.

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create local env file
cp .env.example .env.local
# Edit .env.local and add your Supabase URL and key

# 3. Run dev server
npm run dev
```

Open: **http://localhost:5173/finzo/**

---

## 📁 Project Structure

```
finzo/
├── src/
│   ├── components/
│   │   ├── Shell.jsx        ← App layout wrapper
│   │   ├── Sidebar.jsx      ← Navigation sidebar (open/mini/closed)
│   │   ├── Topbar.jsx       ← Top header bar
│   │   ├── AIChat.jsx       ← Floating AI chat widget
│   │   └── Atoms.jsx        ← Reusable UI components
│   ├── pages/
│   │   ├── Dashboard.jsx    ← Home with charts & AI suggestions
│   │   ├── Transactions.jsx ← CC + UPI/Debit transaction list
│   │   ├── Categories.jsx   ← Month-by-month category breakdown
│   │   ├── Recurring.jsx    ← Recurring charges & frequent merchants
│   │   ├── Budgets.jsx      ← AI-set budgets (editable)
│   │   ├── Subscriptions.jsx← Subscription detector
│   │   ├── Investments.jsx  ← MF, stocks, SIPs
│   │   ├── NetWorth.jsx     ← Assets vs liabilities
│   │   ├── AIAdvisor.jsx    ← Full AI financial report
│   │   ├── Import.jsx       ← PDF upload + email paste
│   │   ├── Settings.jsx     ← Profile, theme, currency, logout
│   │   └── Login.jsx        ← Sign up / log in
│   ├── lib/
│   │   ├── db.js            ← Supabase client (auth + all DB ops)
│   │   ├── pdfParser.js     ← PDF.js parser (runs in browser)
│   │   ├── emailParser.js   ← UPI/CC alert email parser
│   │   ├── merchantRules.js ← 500+ merchant categorization rules
│   │   ├── useStore.js      ← Global state (React Context)
│   │   └── format.js        ← Currency formatter + category data
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase_schema.sql      ← Run this in Supabase SQL Editor
├── .env.example             ← Copy to .env.local for local dev
├── .github/workflows/
│   └── deploy.yml           ← Auto-deploys to GitHub Pages on push
├── package.json
├── vite.config.js
└── index.html
```

---

## 💳 CC vs Debit — No Double Counting

| Source | Tagged As | Shows In |
|---|---|---|
| Credit card PDF statement | `cc_statement` | 💳 CC Spends |
| Debit card PDF statement | `debit_statement` | 📱 UPI/Debit |
| UPI transaction alert email | `upi_email` | 📱 UPI/Debit |
| CC transaction alert email | `cc_alert` | 💳 CC Spends |

Dashboard shows CC and UPI/Debit totals separately — no double counting ever.

---

## 🔒 Privacy

- PDF files are **never uploaded** to any server — parsed entirely in your browser using PDF.js
- Only extracted transaction data (amounts, merchants, dates) is stored in Supabase
- Each user's data is isolated using Supabase Row Level Security — no one can see anyone else's data
- You can delete all your data anytime from Settings

---

## 🏦 Supported Banks (Auto Password Detection)

| Bank | Password Pattern | Example |
|---|---|---|
| HDFC | Name (first 4 caps) + Last 4 digits | `RAHUL5678` |
| SBI | Date of Birth | `01011990` |
| ICICI | Name (lowercase) + Last 4 digits | `rahul5678` |
| Axis | First 4 chars of PAN | `ABCP` |
| Kotak | Date of Birth | `01011990` |
| IndusInd | Date of Birth | `01011990` |
| Others | Prompted manually | — |

---

## 📧 Email Sources Parsed

- Bank statement PDFs (monthly)
- UPI debit/credit alert emails
- Credit card transaction alert emails
- SIP confirmation emails (coming soon)

---

## 🔧 Environment Variables

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_KEY` | Supabase → Settings → API → anon public key |

For local dev → add to `.env.local`
For production → add to GitHub repo Secrets
