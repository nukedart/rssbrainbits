# 🚀 Feedbox — Deploying to rss.brainbits.us

This guide deploys the Feedbox app to **rss.brainbits.us** using your existing
**brainbits** GitHub repository and GitHub Pages custom domain setup.

---

## Overview of what happens

```
github.com/YOUR_USERNAME/brainbits  →  GitHub Pages  →  rss.brainbits.us
          (your existing repo)            (free)          (your subdomain)
```

The CNAME file in `public/CNAME` tells GitHub Pages to serve this repo at
`rss.brainbits.us`. A DNS record at your registrar points the subdomain to GitHub.

---

## Step 1 — Push the updated code to your brainbits repo

In your terminal, from inside the project folder:

```bash
# If you haven't cloned it yet:
git clone https://github.com/YOUR_USERNAME/brainbits.git
cd brainbits

# Copy all files from this Feedbox zip into the brainbits folder
# (replace everything except .git/)

# Then push:
git add .
git commit -m "Rebrand to Feedbox, set up rss.brainbits.us"
git push origin main
```

The GitHub Action will run automatically. Wait for it to complete (green ✅) at:
`https://github.com/YOUR_USERNAME/brainbits/actions`

---

## Step 2 — Set GitHub Secrets (if not already set)

Go to: **github.com/YOUR_USERNAME/brainbits → Settings → Secrets and variables → Actions**

Add these if they're not already there:

| Secret name | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |
| `VITE_ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (optional) |
| `VITE_OPENAI_API_KEY` | platform.openai.com → API Keys (optional) |

The last two are optional — you can always set them inside the app at Settings → API Keys.

---

## Step 3 — Enable GitHub Pages on the brainbits repo

1. Go to **github.com/YOUR_USERNAME/brainbits → Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. If there's a "Custom domain" field already filled in with something else,
   clear it for now — we'll set it properly via the CNAME file in Step 5.

---

## Step 4 — Add DNS record at your registrar

This is the step that makes `rss.brainbits.us` point to GitHub.

Log into wherever you manage brainbits.us DNS (Namecheap, Cloudflare, GoDaddy, etc.)
and add a new record:

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| CNAME | `rss` | `YOUR_USERNAME.github.io` | 3600 (or Auto) |

**Notes by registrar:**
- **Cloudflare**: Type = CNAME, Name = `rss`, Target = `YOUR_USERNAME.github.io`, Proxy = **DNS only** (grey cloud, NOT orange)
- **Namecheap**: Type = CNAME Record, Host = `rss`, Value = `YOUR_USERNAME.github.io.`
- **GoDaddy**: Type = CNAME, Name = `rss`, Value = `YOUR_USERNAME.github.io`

DNS propagation takes anywhere from 2 minutes (Cloudflare) to 48 hours (most others).
You can check propagation at: **dnschecker.org** — search for `rss.brainbits.us` type CNAME.

---

## Step 5 — Set custom domain in GitHub Pages settings

Once the GitHub Action has run successfully (Step 1) and DNS is propagating (Step 4):

1. Go to **github.com/YOUR_USERNAME/brainbits → Settings → Pages**
2. Under **Custom domain**, type: `rss.brainbits.us`
3. Click **Save**
4. Wait for the DNS check to pass (green checkmark) — can take a few minutes
5. Once it passes, tick **Enforce HTTPS**

> ⚠️ If the DNS check fails, DNS hasn't propagated yet. Wait 15 minutes and try again.
> The CNAME file in your repo (`public/CNAME`) ensures this persists across deploys.

---

## Step 6 — Update Supabase redirect URL

Supabase needs to know your new production URL so GitHub OAuth redirects correctly.

1. Go to your Supabase project → **Authentication → URL Configuration**
2. Under **Redirect URLs**, click **Add URL**
3. Add: `https://rss.brainbits.us/`  ← include trailing slash
4. You can keep any old redirect URLs (they don't hurt anything)
5. Click **Save**

---

## Step 7 — Update your GitHub OAuth App

1. Go to **github.com/settings/developers → OAuth Apps → Feedbox**
2. Update **Homepage URL** to: `https://rss.brainbits.us`
3. The **Authorization callback URL** stays the same (points to Supabase, not your domain)
4. Click **Update application**

---

## Step 8 — Verify it all works

1. Open `https://rss.brainbits.us` in your browser
2. You should see the Feedbox login page with your logo
3. Click **Continue with GitHub** — you should land in your inbox
4. If login loops back to the login page → double-check Step 6 (Supabase redirect URL)

---

## Updating the app in the future

Any time you want to push a new version:

```bash
git add .
git commit -m "what you changed"
git push origin main
```

GitHub Actions rebuilds and redeploys to `rss.brainbits.us` in about 2 minutes.
The CNAME file is in `public/` so it gets included in every build automatically —
you never need to re-enter the custom domain in GitHub settings.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `rss.brainbits.us` shows 404 | GitHub Pages not enabled or DNS not propagated | Check Steps 3–5 |
| `rss.brainbits.us` shows your main brainbits.us site | DNS still pointing to main repo | Check DNS record in Step 4 |
| Login loops back to login page | Supabase redirect URL wrong | Re-check Step 6, must have trailing slash |
| Blank white page | `base: "/"` not set in vite.config.js | Already fixed in this version |
| SSL / HTTPS error | "Enforce HTTPS" not ticked yet | Wait for DNS check to pass, then tick it |
| GitHub Pages says "Domain already taken" | Domain is used by another repo | Remove custom domain from the other repo first |
| Feedbox logo not showing | feedbox-logo.png missing from public/ | Make sure public/feedbox-logo.png is committed |
