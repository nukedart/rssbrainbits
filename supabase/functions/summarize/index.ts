/**
 * Feedbox — AI Article Summarizer (Supabase Edge Function)
 * ────────────────────────────────────────────────────────
 * Fallback for the Cloudflare Worker /summarize endpoint.
 * Called from the front-end when the worker is unreachable.
 *
 * SETUP:
 * 1. supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 * 2. supabase functions deploy summarize
 *
 * The front-end sends:
 *   POST /functions/v1/summarize
 *   Authorization: Bearer <supabase-jwt>
 *   Body: { text: "...", title: "..." }
 *
 * Returns: { summary: "..." }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ── Verify user is authenticated ─────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Invalid session" }, 401);
  }

  // ── Check API key is configured ──────────────────────────
  if (!ANTHROPIC_KEY) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  // ── Parse request ────────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { text, title } = body;
  if (!text) {
    return json({ error: "Missing 'text' field" }, 400);
  }

  // ── Call Claude ──────────────────────────────────────────
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a reading assistant. Summarize the following article in 3–5 clear bullet points. Write in plain text only — no markdown, no asterisks, no bold. Each bullet must start with "•" and be a complete, insightful sentence.\n\nTitle: "${title || "Untitled"}"\n\nArticle:\n${text.slice(0, 6000)}`,
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return json({ error: data.error?.message || "Anthropic API error" }, 502);
    }

    const summary = data.content?.[0]?.text || "Could not generate summary.";
    return json({ summary });
  } catch (err) {
    return json({ error: `Summarization failed: ${err.message}` }, 502);
  }
});

// ── Helpers ────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  };
}
