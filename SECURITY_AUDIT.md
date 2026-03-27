# Security Audit — Findings & Fix Instructions

Audited: 2026-03-27

---

## 🔴 Action 1: Rotate Your Supabase Anon Key

**Why:** The key in `.env.local` was read during this session. Not in git, but rotate as a precaution.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → your project → **Project Settings** → **API**
2. Click **Regenerate** next to the `anon` / `public` key
3. Update your local `.env.local`:
   ```
   VITE_SUPABASE_ANON_KEY=<new key here>
   ```
4. Update the GitHub Actions secret:
   - Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
   - Edit `VITE_SUPABASE_ANON_KEY` → paste the new key

---

## 🔴 Action 2: Verify `VITE_ANTHROPIC_API_KEY` is NOT in GitHub Actions

**Why:** Vite bakes all `VITE_*` vars into the JS bundle — anyone can read them in browser DevTools. Anthropic API keys must never be there.

**Steps:**
1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Confirm `VITE_ANTHROPIC_API_KEY` does **not** exist as a secret
3. If it does exist, delete it immediately — your key is currently exposed in every built JS file
4. The app should be using the Cloudflare Worker proxy or Supabase Edge Function to call Anthropic server-side (already set up in this repo)

---

## 🟡 Action 3: Add a Pre-commit Hook to Block `.env` Commits

**Why:** Your `.gitignore` protects you, but a hook gives a second layer — you get an error if you accidentally stage `.env.local`.

**Option A — git-secrets (recommended):**
```bash
brew install git-secrets
git secrets --install        # installs hooks into this repo
git secrets --register-aws   # adds AWS pattern rules (covers many key formats)
```

**Option B — simple manual hook:**

Create `.git/hooks/pre-commit` with this content:
```sh
#!/bin/sh
if git diff --cached --name-only | grep -qE '\.env(\.local|\.production|\.development)?$'; then
  echo "ERROR: Attempting to commit an .env file. Remove it from staging."
  exit 1
fi
```
Then make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🟡 Action 4: Move Cloudflare Worker `ALLOWED_ORIGIN` to an Environment Variable

**Why:** Currently hardcoded as `"https://rss.brainbits.us"` in `cloudflare-worker/worker.js` — not a secret, but fragile if you ever change domains.

**Steps:**
1. In `cloudflare-worker/worker.js`, change:
   ```js
   const ALLOWED_ORIGIN = "https://rss.brainbits.us";
   ```
   to:
   ```js
   const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || "https://rss.brainbits.us";
   ```
2. In Cloudflare dashboard → Workers → your worker → **Settings** → **Variables**, add:
   ```
   ALLOWED_ORIGIN = https://rss.brainbits.us
   ```

---

## ✅ What's Already Clean

| Area | Status | Notes |
|------|--------|-------|
| `.env` files in git | ✅ Safe | `.gitignore` covers all `.env*` patterns |
| Hardcoded API keys in source | ✅ None found | Grep confirmed clean |
| GitHub Actions secrets | ✅ Correct | Uses `${{ secrets.* }}` not plaintext |
| Supabase RLS | ✅ In place | Users only see their own rows |
| `public/` directory | ✅ Clean | No config or credentials exposed |
| Git history | ✅ Clean | No secrets in any prior commit |
| `.claude/` directory | ✅ Correct | `settings.local.json` is gitignored |

---

## Priority Order

1. **Rotate Supabase key** — 2 minutes, do now
2. **Verify no `VITE_ANTHROPIC_API_KEY` in GitHub secrets** — critical if it exists
3. **Pre-commit hook** — 5 minutes, set-and-forget protection
4. **Cloudflare origin env var** — low priority, do when convenient
