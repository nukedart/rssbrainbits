/**
 * Feedbox — AI Article Summarizer (Supabase Edge Function)
 * ────────────────────────────────────────────────────────
 * Supports Claude Haiku (Anthropic) and GPT-4o-mini (OpenAI).
 * Active provider and API keys are read from Supabase tables:
 *   app_config.ai_provider  → 'anthropic' | 'openai'
 *   app_secrets.anthropic_api_key / app_secrets.openai_api_key
 *
 * Falls back to environment secrets if DB keys not set:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *   supabase secrets set OPENAI_API_KEY=sk-...
 *
 * Deploy: supabase functions deploy summarize --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Service-role client to read app_config and app_secrets (bypasses RLS)
const adminClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const PROMPTS: Record<string, string> = {
  keypoints: `Summarize the following article in 3–5 clear bullet points capturing the key ideas and facts. Write in plain text only — no markdown, no asterisks, no bold. Each bullet must start with "•" and be a complete, insightful sentence.`,
  brief:     `Give a 1–2 sentence TL;DR of the following article. Write in plain text only — no markdown, no formatting.`,
  actions:   `Extract 3–5 concrete action items or takeaways from the following article. Write in plain text only. Each item must start with "•" and be a direct, actionable sentence starting with a verb.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Verify user is authenticated ─────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Invalid session" }, 401);

  // ── Parse request ────────────────────────────────────────
  let body: { text?: string; title?: string; style?: string; provider?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { text, title, style = "keypoints" } = body;
  if (!text) return json({ error: "Missing 'text' field" }, 400);

  // ── Resolve provider (request → app_config → default) ────
  let provider = body.provider;
  if (!provider) {
    const { data } = await adminClient.from("app_config").select("value").eq("key", "ai_provider").maybeSingle();
    provider = data?.value || "anthropic";
  }

  // ── Resolve API key (app_secrets → env var) ───────────────
  const secretKey = provider === "openai" ? "openai_api_key" : "anthropic_api_key";
  const envKey    = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  const { data: secretRow } = await adminClient.from("app_secrets").select("value").eq("key", secretKey).maybeSingle();
  const apiKey = secretRow?.value || Deno.env.get(envKey);

  if (!apiKey) {
    return json({ error: `${envKey} not configured. Add it in the Admin panel → AI Settings.` }, 500);
  }

  const prompt    = PROMPTS[style] || PROMPTS.keypoints;
  const maxTokens = style === "actions" ? 1000 : 800;
  const content   = `${prompt}\n\nTitle: "${title || "Untitled"}"\n\nArticle:\n${text.slice(0, 6000)}`;

  // ── Call the active provider ──────────────────────────────
  try {
    let summary: string;

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: "You are a reading assistant." },
            { role: "user", content },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.error?.message || "OpenAI error" }, 502);
      summary = data.choices?.[0]?.message?.content || "Could not generate summary.";
    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: maxTokens,
          messages: [{ role: "user", content: `You are a reading assistant. ${content}` }],
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.error?.message || "Anthropic error" }, 502);
      summary = data.content?.[0]?.text || "Could not generate summary.";
    }

    // ── Track AI usage (fire-and-forget — don't block the response) ──
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data: row } = await adminClient
          .from("ai_usage").select("count")
          .eq("user_id", user.id).eq("date", today).maybeSingle();
        await adminClient.from("ai_usage").upsert(
          { user_id: user.id, date: today, count: (row?.count ?? 0) + 1 },
          { onConflict: "user_id,date" }
        );
      } catch { /* usage tracking is non-critical */ }
    })();

    return json({ summary });
  } catch (err) {
    return json({ error: `Summarization failed: ${(err as Error).message}` }, 502);
  }
});

function json(data: unknown, status = 200) {
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
