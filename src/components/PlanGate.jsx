// ── PlanGate — inline upgrade prompt ─────────────────────────
// Usage: <PlanGate user={user} resource="feeds" currentCount={feeds.length}>
//          <AddFeedButton />
//        </PlanGate>
import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { checkLimit, PLANS } from "../lib/plan";
import { supabase } from "../lib/supabase";
import { track } from "../lib/analytics";

export default function PlanGate({ user, resource, currentCount, children }) {
  const { T } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { allowed, reason } = checkLimit(user, resource, currentCount);
  if (allowed) return <>{children}</>;

  async function handleUpgrade() {
    setLoading(true); setError("");
    track("upgrade_initiated", { surface: "limit_gate", resource });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (json.url) { window.location.href = json.url; return; }
      setError(json.error || "Could not start checkout. Try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${T.accentSurface}, ${T.surface2})`,
      border: `1.5px solid ${T.accent}`,
      borderRadius: 14, padding: "16px 18px", margin: "8px 0",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.accentText }}>Pro feature</span>
        <span style={{ marginLeft: "auto", fontSize: 11, background: T.accent, color: "#fff", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>PRO</span>
      </div>
      <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.5 }}>{reason}</p>
      {error && <p style={{ fontSize: 11, color: T.danger, margin: 0 }}>{error}</p>}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: loading ? T.surface2 : T.accent,
          color: loading ? T.textTertiary : "#fff",
          borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 600,
          border: "none", cursor: loading ? "wait" : "pointer",
          fontFamily: "inherit", marginTop: 2,
        }}>
        {loading ? "Opening checkout…" : `Upgrade to Pro — ${PLANS.pro.price}`}
      </button>
    </div>
  );
}
