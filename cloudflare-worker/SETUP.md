# Feedbox CORS Proxy + AI Summarizer — Cloudflare Worker Setup

## What it does
Two endpoints in one worker:
- **GET `?url=...`** — CORS proxy for RSS feeds (replaces public proxies)
- **POST `/summarize`** — AI article summaries via Claude Haiku (keeps your API key server-side)

## Cost
**Free forever.** Cloudflare Workers free tier gives you 100,000 requests/day.
An RSS reader with 500 users refreshing 10 feeds every 30 min = ~10,000 req/day.
You won't hit the limit until you have ~5,000 active daily users.

## Deploy in 5 minutes

### Option A — Cloudflare Dashboard (no CLI needed)
1. Go to https://dash.cloudflare.com → Workers & Pages → Create Application → Create Worker
2. Paste the contents of `worker.js` into the editor
3. Click **Save and Deploy**
4. Copy the worker URL shown (e.g. `https://feedbox-proxy.yourname.workers.dev`)

### Option B — Wrangler CLI
```bash
cd cloudflare-worker
npm install -g wrangler
npx wrangler login          # opens browser to auth with Cloudflare
npx wrangler deploy         # deploys, prints the worker URL
```

## After deploy

### 1. Add the Anthropic API key as a Worker secret
This keeps your API key on the server — never exposed in browser code.

**Dashboard:** Workers & Pages → your worker → Settings → Variables and Secrets → Add Secret
- Name: `ANTHROPIC_API_KEY`
- Value: `sk-ant-...` (your Anthropic key)

**Or via CLI:**
```bash
npx wrangler secret put ANTHROPIC_API_KEY
# paste your key when prompted
```

### 2. Add worker URL to GitHub Secrets
In your repo → Settings → Secrets and variables → Actions → New secret:
- Name: `VITE_PROXY_URL`
- Value: `https://feedbox-proxy.yourname.workers.dev`

### 3. Add to your local .env.local
```
VITE_PROXY_URL=https://feedbox-proxy.yourname.workers.dev
```

### 4. Update ALLOWED_ORIGIN in worker.js
Change line 23 to your actual domain:
```js
const ALLOWED_ORIGIN = "https://rss.brainbits.us";
```

### 5. Re-deploy after adding secrets
If you used the Dashboard, just re-paste `worker.js` after any edits.
If you used Wrangler: `npx wrangler deploy`

That's it. The app will automatically use your worker for both RSS proxying and AI summaries.
You can remove the Anthropic API key from Settings → API Keys once the worker is live.

## How the fallback works
The app tries three tiers for AI summaries:
1. **Your Cloudflare Worker** `/summarize` — fast, secure, free
2. **Supabase Edge Function** `/functions/v1/summarize` — authenticated fallback
3. **Direct browser call** — dev/local only (requires API key in Settings)

Once the worker is deployed with the secret, tiers 2 and 3 are never hit.
