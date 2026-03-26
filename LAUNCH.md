# Feedbox — Launch Playbook

Everything needed to go from working app to paying users.

---

## Part 1 — Stripe Configuration

### 1.1 Create your Stripe account

1. Go to **stripe.com** → Create account
2. Complete business verification (takes 5–10 min, need SSN or EIN)
3. In the top-left toggle, make sure you're in **Test mode** first — you'll go live later

---

### 1.2 Create the product and price

1. Dashboard → **Products** → **+ Add product**
2. Fill in:
   - **Name:** Feedbox Pro
   - **Description:** Unlimited feeds, AI summaries, full-text reader, reading stats
   - **Image:** optional but helps in Stripe-hosted receipts
3. Under Pricing:
   - **Pricing model:** Standard pricing
   - **Price:** $9.00
   - **Billing period:** Monthly
   - **Currency:** USD
4. Click **Save product**
5. On the product page, click the price → copy the **Price ID** (format: `price_1ABC...`)

---

### 1.3 Set Supabase secrets

Run these in your terminal from the project directory. Get your keys from Stripe Dashboard → **Developers** → **API keys**.

```bash
# Test keys first (sk_test_..., pk_test_...)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_1...

# Set webhook secret AFTER step 1.4
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Also set the service role key (needed for the webhook to update user plans):
```bash
# Supabase Dashboard → Settings → API → service_role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Verify secrets are set:
```bash
supabase secrets list
```

---

### 1.4 Register the Stripe webhook

1. Stripe Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**
2. **Endpoint URL:**
   ```
   https://nmkwbsmdskqqgzsdxray.supabase.co/functions/v1/stripe-webhook
   ```
3. **Events to listen for** (select these):
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
4. Click **Add endpoint**
5. On the webhook detail page → **Signing secret** → **Reveal** → copy `whsec_...`
6. Run: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

### 1.5 Enable the Customer Portal

This powers the "Manage billing" button in Settings.

1. Stripe Dashboard → **Settings** → **Billing** → **Customer portal**
2. Toggle **Activate test link** ON
3. Under **Features**, enable:
   - Cancel subscriptions
   - Update payment methods
4. Under **Cancellation**, set: "Cancel at end of billing period" (not immediately)
5. **Save** — no URL needed, the `create-portal-session` function handles it

---

### 1.6 Test the full flow (test mode)

Use Stripe's test card numbers — no real money moves.

**Test checkout:**
1. Open your app → Settings → Plan & Billing → "Upgrade to Pro"
2. At Stripe checkout, use card: `4242 4242 4242 4242` · any future date · any CVC
3. Complete payment

**Verify it worked:**
- Supabase Dashboard → Authentication → Users → find your user → check `app_metadata`
- Should contain: `{"plan": "pro"}`
- Back in the app → refresh → Plan should show Pro

**Test cancellation:**
1. Settings → "Manage billing" → Cancel subscription
2. Check `app_metadata` updates back to `{"plan": "free"}` after webhook fires

**Test payment failure:**
Use card `4000 0000 0000 0341` — triggers `invoice.payment_failed` event

---

### 1.7 Go live

Once test mode works end-to-end:

1. Stripe Dashboard → toggle from **Test** to **Live** mode
2. Get your live keys: `sk_live_...`
3. Update secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   ```
4. Create a NEW webhook endpoint in live mode (same URL, same events) → get new `whsec_live_...`
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_live_...
   ```
5. Re-deploy functions to pick up new secrets:
   ```bash
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook
   supabase functions deploy create-portal-session
   ```
6. Test once with a real card to confirm

---

## Part 2 — Production Readiness Checklist

### 2.1 GitHub Actions secrets

Your CI/CD (`.github/workflows/deploy.yml`) needs these set in GitHub:

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add each:
| Secret name | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `VITE_ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `VITE_PROXY_URL` | Your Cloudflare Worker URL |

---

### 2.2 Supabase auth settings

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL:** `https://rss.brainbits.us`
3. Add to **Redirect URLs:**
   ```
   https://rss.brainbits.us
   https://rss.brainbits.us/
   ```
4. Authentication → **Email Templates** — customize the confirmation and magic link emails to say "Feedbox" instead of "Supabase"

---

### 2.3 Supabase email (important — default rate limits are very low)

By default Supabase sends only 3 emails/hour in free tier. Fix this before launch:

**Option A (easiest) — Resend:**
1. resend.com → Create account → Get API key
2. Supabase → **Settings** → **Auth** → **SMTP Settings**
3. Enable custom SMTP:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your Resend API key
4. Set sender: `Feedbox <hello@rss.brainbits.us>`

---

### 2.4 Supabase RLS — verify all tables are protected

Run this in Supabase SQL editor to check for unprotected tables:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```
Every table should have RLS enabled. If any return `false`, investigate.

---

### 2.5 Rate limiting on Edge Functions

The `create-checkout` function has no rate limit — a determined user could spam it. Add basic protection:

In Stripe Dashboard → **Radar** → enable **Block card testing** to catch abuse automatically.

---

### 2.6 Error monitoring (optional but useful)

Sentry has a free tier that catches JS errors in production:
1. sentry.io → Create project → JavaScript/Vite
2. Add to `vite.config.js` or just add the CDN snippet to `index.html`
3. Free tier: 5,000 errors/month — more than enough for early stage

---

### 2.7 Pre-launch final checks

Run through this before sharing publicly:

- [ ] Sign up with a new email → confirmation email arrives and works
- [ ] Magic link → email arrives, click works, lands in app
- [ ] Password reset → email arrives, link works
- [ ] Add a feed → RSS items load
- [ ] Open article → reader view loads
- [ ] AI summary → works for free user (5/day), shows limit message after
- [ ] Upgrade to Pro → checkout opens, payment completes, plan updates
- [ ] Manage billing → portal opens, can cancel
- [ ] Cancel → plan downgrades back to free
- [ ] Mobile → key flows work on iPhone Safari
- [ ] Landing page at `/landing.html` loads correctly
- [ ] Terms and Privacy pages load

---

## Part 3 — Getting First Users

### 3.1 The goal

You need ~20 users who will give you honest feedback, not just polite compliments. Paying users (even $1) give much better signal than free users.

**Target:** 10 paying users in 30 days. This validates willingness to pay and funds further development.

---

### 3.2 Immediate actions (Day 1–3)

**Personal network first — always.**

1. **Text or DM 20 people directly** who read a lot: journalists, researchers, developers, writers, investors, academics. Not a mass email — individual messages. Say:

   > "I built an RSS reader with AI summaries and I'd love for you to try it. It's $9/mo but I'm giving the first 10 people 3 months free if they give me feedback. Interested?"

2. **Post in your own social accounts** (Twitter/X, LinkedIn, anywhere you have followers). Be specific about what it does:

   > "I built Feedbox — an RSS reader that actually respects your attention. No algorithm, just the feeds you choose + AI summaries. 10 feeds free forever, unlimited on Pro. Would love early testers. Link in bio."

3. **Share it with anyone who's complained to you about information overload**, feed readers dying, Twitter being unusable, etc.

---

### 3.3 Communities (Week 1–2)

These are the best channels for a tool like this — be a genuine participant, not a spammer. Post your actual experience building it.

**High priority:**
- **Hacker News — Show HN:** Post as `Show HN: I built an RSS reader with AI summaries`. Post Tuesday–Thursday 8–10am ET. Write a personal story in the comments. This alone can get you 500–2,000 visitors and 5–20 signups in a day.
- **r/rss** (reddit.com/r/rss) — RSS enthusiasts who are actively looking for reader alternatives. Very receptive to indie tools.
- **r/selfhosted** — Even though Feedbox isn't self-hosted, this community cares about owning their feeds
- **r/productivity** — Share a workflow post, mention the tool naturally

**Medium priority:**
- **Indie Hackers** — Post a "I'm building in public" update with your MRR goal. The community actively roots for makers.
- **Product Hunt** — Launch here when you have 10+ users and some reviews. Don't launch cold.
- **Twitter/X** — Search for people complaining about Google Reader shutting down (still a sore spot), Feedly price increases, or information overload. Reply genuinely.

**Niche communities:**
- Newsletter writers (they follow lots of feeds for research) — try Beehiiv's community, Ghost's forum, Substack's Notes
- Journalists and researchers on Twitter — RSS is a professional tool for them
- Developer communities: dev.to, Lobste.rs (very RSS-friendly crowd)

---

### 3.4 Campaigns that work for this type of app

**Campaign 1: "Ditch the algorithm" angle**

The hook: People are exhausted by algorithmic feeds (Twitter, LinkedIn, TikTok). Feedbox is the antidote.

Copy: *"I read 40+ sources a day without doomscrolling. The secret: RSS + AI summaries. Here's my setup →"*

Then link to a short blog post (can be on GitHub Pages/your domain) showing your actual feed list. Soft-pitch Feedbox at the end.

**Campaign 2: The Feedly/Inoreader refugee campaign**

Feedly raised prices aggressively. Many users are actively looking for alternatives.

- Search Twitter/X for "feedly alternative" or "feedly price increase" — reply to recent posts
- Post in r/rss: "I switched from Feedly to building my own — here's what I learned" (genuine post, not an ad)
- Write a comparison page: `rss.brainbits.us/vs-feedly.html` — simple static page covering the differences

**Campaign 3: "I built this for myself" story**

This performs extremely well. People love origin stories and root for indie makers.

Post on HN, Indie Hackers, and Twitter:

*"I was paying $96/yr for Feedly and barely using it. I spent 3 months building my own. It has AI summaries now and I open it every morning. You can use it too — free plan available."*

Authenticity converts far better than polished marketing copy.

**Campaign 4: Targeted outreach to power RSS users**

There's a community of people who publicly advocate for RSS:

- Search Twitter for "RSS" + "still use" or "RSS is not dead"
- These people are pre-sold on the concept — just show them the product
- Many have large audiences and will share if they like it

**Campaign 5: The free-to-paid conversion campaign (once you have users)**

Once you have 50+ free users:
- Email them directly (Supabase gives you the list): "You've been using Feedbox for X days. What's the one thing that would make you pay for Pro?"
- Use the answers to improve the upgrade wall messaging
- Offer a "founding member" rate: $6/mo locked in forever if they upgrade in the next 7 days

---

### 3.5 Pricing psychology tips

- **$9/mo feels like a rounding error to someone who reads seriously.** Don't discount unless you're using it as a specific campaign hook.
- **Annual plan:** Add a `$79/yr` option (saves ~$29). Annual users churn much less and give you cash upfront. Easy to add in Stripe: create a second price on the same product.
- **Founding member offer:** First 50 subscribers get $6/mo locked in forever. Creates urgency and rewards early adopters. Run this for the first 2 weeks only.

---

### 3.6 Metrics to track

Set up a simple Notion or spreadsheet. Check weekly:

| Metric | Target (30 days) |
|---|---|
| Signups | 100 |
| Free → trial started | 30% |
| Paid conversions | 10 |
| MRR | $90 |
| Churn | < 2 users |
| Most-used feature | track via analytics |

The most important early signal: **Do people come back the next day?** Check your Supabase `history` table — are users opening articles 2+ days after signing up?

---

### 3.7 Things that will kill early traction

- Launching to everyone at once before fixing critical bugs → bad first impressions are permanent
- Soft-launching with a waitlist → unnecessary friction, you have no scale problem yet
- Spending more than 2 hours on the landing page → ship it, iterate later
- Waiting until it's "ready" → it's ready now

---

## Part 4 — Quick Reference

### Useful URLs once live

| What | URL |
|---|---|
| App | https://rss.brainbits.us |
| Landing page | https://rss.brainbits.us/landing.html |
| Terms | https://rss.brainbits.us/terms.html |
| Privacy | https://rss.brainbits.us/privacy.html |
| Supabase dashboard | https://supabase.com/dashboard/project/nmkwbsmdskqqgzsdxray |
| Edge functions | https://supabase.com/dashboard/project/nmkwbsmdskqqgzsdxray/functions |
| Stripe dashboard | https://dashboard.stripe.com |

### Key CLI commands

```bash
# Deploy edge functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy create-portal-session

# Push DB migrations
supabase db push

# Check secrets
supabase secrets list

# Set a secret
supabase secrets set KEY=value

# Deploy app
npm run deploy        # patch version bump + build + push
npm run deploy:minor  # minor version bump
```

### Manually upgrade a user to Pro (Supabase SQL editor)

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"plan":"pro"}'
WHERE email = 'user@example.com';
```

### Check today's AI usage for a user

```sql
SELECT u.email, a.count, a.date
FROM ai_usage a
JOIN auth.users u ON u.id = a.user_id
WHERE a.date = CURRENT_DATE
ORDER BY a.count DESC;
```
