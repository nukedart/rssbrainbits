/**
 * Feedbox — Create Stripe Customer Portal Session (Supabase Edge Function)
 * ────────────────────────────────────────────────────────────────────────
 * Called when a Pro user clicks "Manage billing".
 * Returns a Stripe Customer Portal URL for self-service cancellation/updates.
 *
 * SETUP:
 * 1. Enable Customer Portal in Stripe Dashboard → Settings → Billing → Customer Portal
 * 2. Same STRIPE_SECRET_KEY secret as create-checkout (already set)
 * 3. supabase functions deploy create-portal-session
 */

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_URL = "https://rss.brainbits.us";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

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

  const customerId = user.user_metadata?.stripe_customer_id;
  if (!customerId) {
    return new Response(
      JSON.stringify({ error: "No Stripe customer found. Please contact support." }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: APP_URL,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Portal error:", err);
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
