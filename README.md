# 🧠 BrainBits

> Your calm reading space. RSS feeds, articles, and YouTube — with AI summaries, highlights, notes, tags, and read-aloud with word sync.

**Stack:** React + Vite · GitHub Pages (free hosting) · Supabase (free DB + auth) · Anthropic API (AI summaries) · Browser Web Speech API (TTS, free)

---

## What This App Does

| Feature | Details |
|---|---|
| **GitHub Sign-In** | One-click login via Supabase OAuth. No passwords. |
| **RSS Feeds** | Subscribe to any RSS or Atom feed. |
| **Article Reader** | Paste any URL for a clean, distraction-free read. |
| **YouTube** | Paste a YouTube link → embedded player + AI summary. |
| **AI Summaries** | 3–5 bullet summaries via Claude Haiku. |
| **Highlights** | Select text → pick a color (yellow/green/blue/purple). |
| **Notes on highlights** | Tap any highlight → add a Kindle-style note. |
| **Tags** | Tag any article for easy filtering later. |
| **Read Aloud (TTS)** | Browser Web Speech API — free, works offline, syncs word-by-word highlighting as it speaks. |
| **History** | Every article you open, auto-saved. |
| **Saved** | Bookmark articles with their AI summaries. |
| **Light + Dark mode** | Things 3-inspired design, system-preference aware. |
| **PWA** | Install on iPhone/Android home screen like a native app. |

---

## Architecture — Zero Fixed Cost

```
Browser (React PWA)
  │
  ├── Auth & DB    → Supabase (free Spark plan)
  ├── RSS/Article  → allorigins.win CORS proxy (free, no key)
  ├── AI Summary   → Anthropic API (Claude Haiku, ~$0.001/summary)
  ├── TTS          → Browser Web Speech API (free, built-in)
  └── Hosting      → GitHub Pages (free forever)
```

**Monthly cost for personal use: ~$0.02–$0.10** (only Anthropic API if you use summaries)

---

## What You Need Before Starting

Make sure you have these installed and accounts created:

- [ ] **Node.js 18+** → download at [nodejs.org](https://nodejs.org) (choose LTS)
- [ ] **Git** → download at [git-scm.com](https://git-scm.com)
- [ ] **GitHub account** → [github.com](https://github.com)
- [ ] **Supabase account** (free) → [supabase.com](https://supabase.com)
- [ ] **Anthropic account** → [console.anthropic.com](https://console.anthropic.com)

To verify Node and Git are installed, open Terminal and run:
```bash
node --version   # should print v18.x.x or higher
git --version    # should print git version 2.x.x
```

---

## Step 1 — Create Your GitHub Repository

- Go to [github.com/new](https://github.com/new)
- **Repository name:** `brainbits`
- Set visibility to **Public**
- Leave everything else unchecked (no README, no .gitignore)
- Click **Create repository**
- Copy the repo URL — you'll need it in Step 3

---

## Step 2 — Set Up Supabase

### 2a. Create a project

- Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- Click **New project**
- Fill in:
  - **Name:** brainbits
  - **Database password:** choose something strong — save it in your password manager
  - **Region:** pick the one closest to you
- Click **Create new project** (takes about 2 minutes to provision)

### 2b. Run the database schema

- In your Supabase project, click **SQL Editor** in the left sidebar
- Click **New query**
- Open the file `supabase-schema.sql` from this project folder
- Copy the entire contents and paste into the editor
- Click **Run** (the green button)
- You should see: *"Success. No rows returned."*

This creates 5 tables: `feeds`, `history`, `saved`, `highlights`, `article_tags` — all with row-level security so users only see their own data.

### 2c. Enable GitHub OAuth

- In Supabase, go to **Authentication → Providers** in the left sidebar
- Find **GitHub** and click to expand it
- Toggle **Enable** on — you'll see two fields: Client ID and Client Secret

**Now create a GitHub OAuth App:**

1. In a new tab, go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **OAuth Apps → New OAuth App**
3. Fill in:
   - **Application name:** BrainBits
   - **Homepage URL:** `https://YOUR_GITHUB_USERNAME.github.io/brainbits`
     *(replace YOUR_GITHUB_USERNAME with your actual username)*
   - **Authorization callback URL:** copy this from the Supabase GitHub provider page
     *(looks like `https://abcdefgh.supabase.co/auth/v1/callback`)*
4. Click **Register application**
5. Copy the **Client ID** shown on the page
6. Click **Generate a new client secret** → copy the secret immediately (it's only shown once)

**Back in Supabase:**
- Paste the **Client ID** and **Client Secret** into the GitHub provider fields
- Click **Save**

### 2d. Copy your Supabase API credentials

- Go to **Project Settings** (gear icon at bottom of left sidebar) → **API**
- Copy and save these two values — you'll need them in Step 4:
  - **Project URL** (looks like `https://abcdefgh.supabase.co`)
  - **anon / public** key (the long string — this is safe to use in frontend code)

---

## Step 3 — Set Up the Project Locally

### 3a. Clone your repo and add the files

Open Terminal, navigate to where you want your project, then:

```bash
# Clone the empty repo you created in Step 1
git clone https://github.com/YOUR_USERNAME/brainbits.git
cd brainbits
```

Now copy all the files from this BrainBits folder into the `brainbits` directory you just cloned. Your folder should look exactly like this:

```
brainbits/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← auto-deploys on every git push
├── public/
│   ├── favicon.svg
│   ├── manifest.json
│   └── icons/                  ← add your icons here (see Step 7)
├── src/
│   ├── components/
│   │   ├── AddModal.jsx        ← bottom sheet for adding feeds/URLs
│   │   ├── BottomNav.jsx       ← tab bar
│   │   ├── ContentViewer.jsx   ← full-screen reader (highlights + TTS)
│   │   ├── FeedItem.jsx        ← article row component
│   │   ├── HighlightsDrawer.jsx← right panel showing all highlights
│   │   ├── NotePanel.jsx       ← slide-up note editor
│   │   ├── SelectionToolbar.jsx← floating color picker on text select
│   │   ├── TagsInput.jsx       ← tag chip input
│   │   ├── TTSPlayer.jsx       ← floating read-aloud player bar
│   │   └── UI.jsx              ← shared primitives (Button, Card, etc.)
│   ├── hooks/
│   │   ├── useAuth.jsx         ← auth context
│   │   └── useTheme.jsx        ← theme context (light/dark + tokens)
│   ├── lib/
│   │   ├── fetchers.js         ← RSS, article, YouTube, AI summary
│   │   ├── supabase.js         ← all database helpers
│   │   └── tokens.js           ← Design OS color tokens
│   ├── pages/
│   │   ├── InboxPage.jsx       ← main feed view
│   │   ├── LoginPage.jsx       ← GitHub sign-in screen
│   │   └── SecondaryPages.jsx  ← History, Saved, Settings pages
│   ├── App.jsx                 ← app shell + routing
│   ├── index.css               ← global styles + animations
│   └── main.jsx                ← React entry point
├── .env.example                ← copy this to .env.local
├── .gitignore
├── index.html
├── package.json
├── supabase-schema.sql         ← run this in Supabase SQL editor
└── vite.config.js
```

### 3b. Create your local environment file

```bash
# From inside the brainbits folder:
cp .env.example .env.local
```

Open `.env.local` in any text editor (VS Code, Notepad, etc.) and fill in your values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Where to get each:
- **Supabase values:** from Step 2d above
- **Anthropic key:** [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key. Set a spend cap under Billing → Spend limits (start with $5).

### 3c. Update the base path for your repo name

Open `vite.config.js` and confirm the `base` matches your repo name:

```js
base: "/brainbits/",  // ← change if your repo has a different name
```

### 3d. Install and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173/brainbits/](http://localhost:5173/brainbits/) in your browser.

You should see the BrainBits login screen. Click **Continue with GitHub** — it will redirect to GitHub, ask for permission, then redirect back and show your inbox.

**Blank page or console errors?**
- Open browser DevTools (F12 on Windows, Cmd+Option+I on Mac) → Console tab
- The most common issue is a typo in `.env.local`. Double-check the values match exactly.

---

## Step 4 — Test All Features Locally

Before deploying, verify each feature works:

- [ ] **Sign in** with GitHub → see empty inbox
- [ ] Click **+ Add** → paste an RSS feed URL (try `https://feeds.feedburner.com/oreilly/radar`)
- [ ] Articles appear in inbox → click one to open the reader
- [ ] In the reader, **select some text** → color picker appears → pick yellow
- [ ] Tap the highlight → **NotePanel** appears → write a note → Save
- [ ] Click the **🏷** button → add a tag like `research`
- [ ] Click **✨ Summarize with AI** → AI summary appears (requires Anthropic key)
- [ ] Click **🔊** (headphones) button in top bar → TTS player appears at bottom
- [ ] Click ▶ → article is read aloud, current word highlighted in blue as it speaks
- [ ] Try speed controls (0.75×, 1×, 1.25×, etc.)
- [ ] Click **Save** → article appears in Saved tab
- [ ] Check **History** tab → article appears there too

---

## Step 5 — Deploy to GitHub Pages

### 5a. Add secrets to GitHub

Your `.env.local` file is local only (never pushed to git). For the deployed version, you store secrets in GitHub:

- Go to your GitHub repo
- Click **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret** for each of the following:

| Secret name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic API key |

### 5b. Enable GitHub Pages

- In your GitHub repo, go to **Settings → Pages**
- Under **Source**, select **GitHub Actions**
- You don't need to select a branch — the workflow file handles everything

### 5c. Push your code

```bash
# From inside the brainbits folder:
git add .
git commit -m "Initial BrainBits setup"
git push origin main
```

This push triggers the GitHub Action automatically. Watch the progress at:
`https://github.com/YOUR_USERNAME/brainbits/actions`

After about 2 minutes the action completes. Your app is live at:
```
https://YOUR_USERNAME.github.io/brainbits/
```

---

## Step 6 — Fix the OAuth Redirect URL (Required!)

After deploying, you need to tell Supabase your production URL so the GitHub login redirect works:

- Go to your Supabase project → **Authentication → URL Configuration**
- Under **Redirect URLs**, click **Add URL**
- Add: `https://YOUR_USERNAME.github.io/brainbits/`
  *(include the trailing slash)*
- Click **Save**

Test it: open your live URL, click **Continue with GitHub** — it should now sign you in on the deployed version.

---

## Step 7 — Add App Icons (Recommended for PWA)

Without icons, the PWA install will use a generic placeholder.

1. Create a 512×512 PNG of the 🧠 emoji or your own logo
2. Go to [realfavicongenerator.net](https://realfavicongenerator.net) and upload it
3. Download the package and place these files:
   - `icon-192.png` → `public/icons/icon-192.png`
   - `icon-512.png` → `public/icons/icon-512.png`
   - `apple-touch-icon.png` → `public/icons/apple-touch-icon.png`
4. Commit and push → redeploys automatically

---

## Step 8 — Install as PWA on iPhone

1. Open your live URL (`https://YOUR_USERNAME.github.io/brainbits/`) in **Safari** on iPhone
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** in the top right

BrainBits now appears on your home screen like a native app.

**For the best TTS voice quality on iPhone:**
- Go to **Settings → Accessibility → Spoken Content → Voices**
- Select **English** → download an **Enhanced** or **Premium** Siri voice
- The Premium voices (Siri-quality) are the same engine used for "Hey Siri"

---

## How TTS + Word Sync Works

The read-aloud feature uses the browser's built-in **Web Speech API** — no API key, no cost, works offline.

```
Tap 🔊  →  TTSPlayer appears at bottom of screen
Tap ▶   →  SpeechSynthesisUtterance created with article text
           Browser picks best available English voice
           onboundary event fires on every word →
           ContentViewer highlights that word in the article body
           Word scrolls into view automatically
Tap ⏸   →  Paused (resumes from same word)
Tap speed →  Cycles through 0.75× / 1× / 1.25× / 1.5× / 1.75× / 2×
Tap ×   →  Stops and dismisses player
```

The word highlighted in the article during playback uses the `.tts-active-word` CSS class (blue glow). This is separate from your manual highlights (colored backgrounds) — both can coexist.

---

## Deploying Updates

Any time you change code, just push to main:

```bash
git add .
git commit -m "describe what you changed"
git push origin main
```

GitHub Actions rebuilds and redeploys automatically in ~2 minutes.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page on load | Check browser console for errors. Usually a typo in env variables. |
| GitHub login loops back to login | Add your GitHub Pages URL to Supabase → Authentication → Redirect URLs |
| RSS feed won't load | Open the feed URL directly in your browser first. Some feeds block the CORS proxy. |
| AI summary fails | Verify `VITE_ANTHROPIC_API_KEY` is set in GitHub Secrets (not just .env.local) |
| TTS doesn't speak | Some browsers require a user interaction first. Click the play button, not just opening the player. |
| TTS word sync is off | This varies by browser. Chrome on desktop and Safari on iPhone give the most accurate boundary events. |
| Highlights don't save | Open DevTools console — usually a Supabase RLS policy issue. Re-run the schema SQL. |
| Deploy action fails | Go to GitHub → Actions tab → click the failed run → read the error log |

---

## Cost Reference

| Service | Free tier | Your usage | Monthly cost |
|---|---|---|---|
| GitHub Pages | Unlimited for public repos | All hosting | **$0** |
| Supabase | 500MB DB, 50k MAU | Tiny for personal use | **$0** |
| allorigins CORS proxy | No rate limits for normal use | RSS + article fetch | **$0** |
| Browser Web Speech | Built into every browser | TTS | **$0** |
| Anthropic (Claude Haiku) | None, pay per use | ~$0.001/summary | **~$0.02–$0.10/mo** |
| **Total** | | | **< $0.10/month** |

---

*Built with your Design OS · Things 3 aesthetic · Calm by design*
