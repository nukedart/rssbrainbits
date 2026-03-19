// ── PlanGate — inline upgrade prompt ─────────────────────────
// Usage: <PlanGate user={user} resource="feeds" currentCount={feeds.length}>
//          <AddFeedButton />
//        </PlanGate>
import { useTheme } from "../hooks/useTheme";
import { checkLimit, PLANS } from "../lib/plan";

export default function PlanGate({ user, resource, currentCount, children }) {
  const { T } = useTheme();
  const { allowed, reason, limit } = checkLimit(user, resource, currentCount);
  if (allowed) return <>{children}</>;

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
      <a href="mailto:hello@brainbits.us?subject=Feedbox Pro"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: T.accent, color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", marginTop: 2 }}>
        Upgrade to Pro — {PLANS.pro.price}
      </a>
    </div>
  );
}
