# Feedbox CORS Proxy — Cloudflare Worker Setup

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

### 1. Add to GitHub Secrets
In your repo → Settings → Secrets and variables → Actions → New secret:
- Name: `VITE_PROXY_URL`
- Value: `https://feedbox-proxy.yourname.workers.dev`

### 2. Add to your local .env.local
```
VITE_PROXY_URL=https://feedbox-proxy.yourname.workers.dev
```

### 3. Update ALLOWED_ORIGIN in worker.js
Change line 13 to your actual domain:
```js
const ALLOWED_ORIGIN = "https://rss.brainbits.us";
```

That's it. The app will automatically use your proxy instead of the public ones.
