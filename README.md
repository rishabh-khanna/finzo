# Finzo — Setup & Deployment Guide

## Stack
| Layer | Tool | Cost |
|---|---|---|
| Frontend | React + Vite | ₹0 forever |
| Hosting | GitHub Pages | ₹0 forever |
| Backend + DB | PocketBase on Fly.io | ₹0 forever |
| PDF Parse | PDF.js (browser) | ₹0 forever |
| Auth | PocketBase auth | ₹0 forever |

---

## Step 1 — Deploy PocketBase on Fly.io (5 minutes)

### 1a. Create Fly.io account
Go to https://fly.io → Sign up (no card needed for hobby apps)

### 1b. Install Fly CLI
```bash
# macOS
brew install flyctl

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Linux
curl -L https://fly.io/install.sh | sh
```

### 1c. Login
```bash
flyctl auth login
```

### 1d. Deploy PocketBase
```bash
# From this project folder
flyctl launch --name finzo-pb --region bom --no-deploy

# Create a volume for data persistence
flyctl volumes create pb_data --region bom --size 1

# Deploy
flyctl deploy
```

### 1e. Note your PocketBase URL
It will be: `https://finzo-pb.fly.dev`

### 1f. Setup PocketBase admin
Go to: `https://finzo-pb.fly.dev/_/`
Create admin account — save these credentials safely.

---

## Step 2 — Deploy Frontend on GitHub Pages (5 minutes)

### 2a. Create GitHub repo
Go to github.com → New repository → Name it `finzo` → Public

### 2b. Push code
```bash
git init
git add .
git commit -m "Initial Finzo commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finzo.git
git push -u origin main
```

### 2c. Add environment variable
Go to your repo → Settings → Secrets and variables → Actions → New secret
- Name: `VITE_PB_URL`
- Value: `https://finzo-pb.fly.dev`

### 2d. Enable GitHub Pages
Go to your repo → Settings → Pages
- Source: GitHub Actions
- Save

### 2e. Trigger deploy
Go to Actions tab → Run workflow

Your app will be live at:
`https://YOUR_USERNAME.github.io/finzo`

Share this URL with your 2 testers.

---

## Step 3 — Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start PocketBase locally (download from pocketbase.io)
./pocketbase serve

# 3. In another terminal, start Vite
npm run dev
```

Local dev URLs:
- Frontend: http://localhost:5173/finzo/
- PocketBase admin: http://localhost:8090/_/

---

## Environment Variables

Create `.env.local` for local dev:
```env
VITE_PB_URL=http://127.0.0.1:8090
```

For production (set in GitHub Secrets):
```env
VITE_PB_URL=https://finzo-pb.fly.dev
```

---

## Important: CC vs Debit Statement Separation

When importing statements:
- **Credit Card PDF** → Source tagged as `cc_statement` → shows in CC section
- **Debit Card PDF / UPI Alerts** → Source tagged as `debit_statement` or `upi_email` → shows in UPI/Debit section
- Dashboard shows them separately — no double counting

---

## PocketBase Free Tier Limits
- 3 shared VMs free
- 1GB volume storage
- No bandwidth limits
- Never expires

## GitHub Pages Free Tier Limits
- Unlimited bandwidth for static sites
- 1GB storage
- Never expires

## Total cost: ₹0/month forever
