/**
 * Feedbox — Admin Stats (Supabase Edge Function)
 * ─────────────────────────────────────────────
 * Returns aggregated dashboard data for the admin panel.
 * Only callable by users with is_admin: true in user_metadata.
 *
 * SETUP:
 *   supabase functions deploy admin-stats
 *   (Uses SUPABASE_SERVICE_ROLE_KEY already set for stripe-webhook)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const adminClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // ── Auth gate: must be a logged-in admin ───────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!user.user_metadata?.is_admin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // ── Build dashboard data ───────────────────────────────────
  const now      = new Date();
  const ago30    = new Date(now); ago30.setDate(ago30.getDate() - 30);
  const ago7     = new Date(now); ago7.setDate(ago7.getDate() - 7);
  const ago30iso = ago30.toISOString();
  const ago7iso  = ago7.toISOString();

  // ── Users (from auth) ──────────────────────────────────────
  const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

  const totalUsers   = allUsers.length;
  const proUsers     = allUsers.filter(u => u.user_metadata?.plan === "pro").length;
  const freeUsers    = totalUsers - proUsers;
  const newUsers7d   = allUsers.filter(u => u.created_at >= ago7iso).length;
  const newUsers30d  = allUsers.filter(u => u.created_at >= ago30iso).length;

  // Recent user list (last 20 signups)
  const recentUsers = allUsers
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)
    .map(u => ({
      id:         u.id,
      email:      u.email,
      plan:       u.user_metadata?.plan || "free",
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
    }));

  // MRR estimate ($9 × pro users)
  const mrr = proUsers * 9;

  // ── Subscription events (last 30d) ─────────────────────────
  const { data: subEvents } = await adminClient
    .from("subscription_events")
    .select("user_id, event, plan, created_at")
    .gte("created_at", ago30iso)
    .order("created_at", { ascending: false });

  const upgrades30d     = (subEvents || []).filter(e => e.event === "upgraded").length;
  const cancellations30d = (subEvents || []).filter(e => e.event === "cancelled").length;

  const recentSubEvents = (subEvents || []).slice(0, 30).map(e => ({
    ...e,
    email: allUsers.find(u => u.id === e.user_id)?.email || "unknown",
  }));

  // ── Analytics events (last 30d) ───────────────────────────
  const { data: aEvents } = await adminClient
    .from("analytics_events")
    .select("event, user_id, session_id, created_at")
    .gte("created_at", ago30iso)
    .order("created_at", { ascending: false });

  const analyticsRows = aEvents || [];

  // DAU chart — last 30 days
  const dauByDay: Record<string, Set<string>> = {};
  for (const r of analyticsRows) {
    const day = r.created_at.slice(0, 10);
    if (!dauByDay[day]) dauByDay[day] = new Set();
    if (r.user_id) dauByDay[day].add(r.user_id);
  }
  const days30: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days30.push(d.toISOString().slice(0, 10));
  }
  const dauChart = days30.map(day => ({ day, count: dauByDay[day]?.size || 0 }));

  // Event counts
  const eventCounts: Record<string, number> = {};
  for (const r of analyticsRows) {
    eventCounts[r.event] = (eventCounts[r.event] || 0) + 1;
  }
  const topEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([event, count]) => ({ event, count }));

  // Unique users
  const uniqueUsers30d = new Set(analyticsRows.map(r => r.user_id).filter(Boolean)).size;
  const uniqueUsers7d  = new Set(
    analyticsRows.filter(r => r.created_at >= ago7iso).map(r => r.user_id).filter(Boolean)
  ).size;
  const uniqueUsersToday = new Set(
    analyticsRows.filter(r => r.created_at >= now.toISOString().slice(0, 10)).map(r => r.user_id).filter(Boolean)
  ).size;

  // Upgrade funnel
  const limitHits      = eventCounts["plan_limit_hit"] || 0;
  const upgradeClicked = eventCounts["upgrade_initiated"] || 0;

  // Recent activity feed (last 50 analytics events with email)
  const recentActivity = analyticsRows.slice(0, 50).map(r => ({
    event:      r.event,
    user_email: allUsers.find(u => u.id === r.user_id)?.email || null,
    created_at: r.created_at,
  }));

  return new Response(JSON.stringify({
    users: { totalUsers, proUsers, freeUsers, newUsers7d, newUsers30d, mrr, recentUsers },
    subscriptions: { upgrades30d, cancellations30d, recentSubEvents },
    analytics: {
      totalEvents: analyticsRows.length,
      uniqueUsers30d, uniqueUsers7d, uniqueUsersToday,
      dauChart, topEvents,
      funnel: { limitHits, upgradeClicked, upgrades: upgrades30d },
    },
    recentActivity,
  }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
