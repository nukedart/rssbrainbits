/**
 * Feedbox — Create Stripe Checkout Session (Supabase Edge Function)
 * ─────────────────────────────────────────────────────────────────
 * Called by the front-end when user clicks "Upgrade to Pro".
 * Returns a Stripe Checkout URL — user is redirected there.
 *
 * SETUP:
 * 1. Create a Product + Price in Stripe Dashboard:
 *    Products → Add Product → "Feedbox Pro" → $5/month recurring
 *    Copy the Price ID (looks like price_1ABC...)
 * 2. supabase secrets set STRIPE_SECRET_KEY=sk_live_...
 * 3. supabase secrets set STRIPE_PRO_PRICE_ID=price_1ABC...
 * 4. supabase functions deploy create-checkout
 */

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_ID = Deno.env.get("STRIPE_PRO_PRICE_ID")!;
const APP_URL  = "https://rss.brainbits.us";

Deno.serve(async (req) => {
  // CORS for browser requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify user is authenticated via Supabase JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Reuse existing Stripe customer if we have one
    const existingCustomerId = user.user_metadata?.stripe_customer_id;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingCustomerId || undefined,
      customer_email: existingCustomerId ? undefined : user.email!,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}?upgrade=success`,
      cancel_url:  `${APP_URL}?upgrade=cancelled`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        trial_period_days: 7, // 7-day free trial
      },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Stripe error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://rss.brainbits.us",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
