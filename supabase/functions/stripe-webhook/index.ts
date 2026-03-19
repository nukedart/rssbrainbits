/**
 * Feedbox — Stripe Webhook Handler (Supabase Edge Function)
 * ─────────────────────────────────────────────────────────
 * Listens for Stripe events and updates user plan in Supabase.
 *
 * SETUP (one-time):
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. supabase login
 * 3. supabase link --project-ref YOUR_PROJECT_REF
 * 4. supabase secrets set STRIPE_SECRET_KEY=sk_live_...
 * 5. supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 * 6. supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...  (from project settings)
 * 7. supabase functions deploy stripe-webhook
 * 8. In Stripe Dashboard → Webhooks → Add endpoint:
 *    URL: https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
 *    Events: checkout.session.completed, customer.subscription.deleted,
 *            customer.subscription.updated, invoice.payment_failed
 */

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role — bypasses RLS
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify Stripe signature
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEventAsync
      ? await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret)
      : stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("Stripe event:", event.type);

  try {
    switch (event.type) {
      // ── User completed checkout → upgrade to Pro ──────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email || session.customer_email;
        const customerId = session.customer as string;

        if (!email) break;

        await setPlan(email, "pro", customerId);
        await logEvent(email, "upgraded", "pro");
        break;
      }

      // ── Subscription cancelled or expired → downgrade ─────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const email = await getEmailFromCustomer(sub.customer as string);
        if (email) {
          await setPlan(email, "free", sub.customer as string);
          await logEvent(email, "cancelled", "free");
        }
        break;
      }

      // ── Payment failed → warn but don't downgrade yet ─────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = await getEmailFromCustomer(invoice.customer as string);
        console.log(`Payment failed for ${email} — keeping Pro for grace period`);
        // Stripe will retry 3× over 7 days by default before cancelling
        break;
      }

      // ── Subscription updated (e.g. plan change) ───────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const isActive = ["active", "trialing"].includes(sub.status);
        const email = await getEmailFromCustomer(sub.customer as string);
        if (email) {
          await setPlan(email, isActive ? "pro" : "free", sub.customer as string);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Handler error:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ── Helpers ───────────────────────────────────────────────────

async function setPlan(email: string, plan: string, stripeCustomerId: string) {
  // Find user by email
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error(`User not found for email: ${email}`);
    return;
  }

  // Update user metadata with plan + stripe customer id
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        plan,
        stripe_customer_id: stripeCustomerId,
        plan_updated_at: new Date().toISOString(),
      },
    }
  );

  if (updateError) throw updateError;
  console.log(`Set plan=${plan} for ${email}`);
}

async function getEmailFromCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return (customer as Stripe.Customer).email || null;
  } catch {
    return null;
  }
}

async function logEvent(email: string, event: string, plan: string) {
  // Find user id
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find(u => u.email === email);
  if (!user) return;

  await supabase.from("subscription_events").insert({
    user_id: user.id,
    event,
    plan,
  });
}
