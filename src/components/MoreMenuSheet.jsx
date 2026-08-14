import { useTheme } from "../hooks/useTheme";
import { SHAPE } from "../lib/tokens";

// ── Icons (matched to Sidebar.jsx's Icons.History / Icons.Analytics / Icons.Settings) ──
const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>
);
const AnalyticsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="3" height="5" rx="1"/><rect x="6.5" y="5" width="3" height="9" rx="1"/><rect x="11" y="2" width="3" height="12" rx="1"/></svg>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>
);
const SourcesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12"/><path d="M2 8h8"/><path d="M2 12h5"/><circle cx="13" cy="11" r="2.5"/><path d="M13 8.5v1M13 13.5v1"/></svg>
);

const ITEMS = [
  { id: "manage-feeds", label: "Manage Feeds", Icon: SourcesIcon   },
  { id: "history",      label: "History",      Icon: HistoryIcon   },
  { id: "analytics",    label: "Stats",         Icon: AnalyticsIcon },
  { id: "settings",     label: "Settings",      Icon: SettingsIcon  },
];

export default function MoreMenuSheet({ active, onNavigate, onClose, feedErrorCount = 0 }) {
  const { T } = useTheme();

  function navigate(page) {
    onNavigate(page);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,.45)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          animation: "fadeIn .18s ease",
        }}
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 901,
          background: T.card,
          display: "flex", flexDirection: "column",
          borderTopLeftRadius: SHAPE.radiusCard,
          borderTopRightRadius: SHAPE.radiusCard,
          boxShadow: SHAPE.shadowFloatUp,
          animation: "slideInUp .25s cubic-bezier(.22,.68,0,1.12)",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        {/* Drag handle (visual only — tap backdrop or close button to dismiss) */}
        <div style={{ padding: "12px 0 8px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: SHAPE.radiusPill, background: T.surface2 }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "2px 20px 8px", flexShrink: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: T.text, flex: 1, letterSpacing: "-.03em" }}>More</span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none", border: "none", padding: "4px",
              cursor: "pointer", color: T.textTertiary,
              display: "flex", alignItems: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>
          </button>
        </div>

        {/* Rows */}
        <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {ITEMS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px",
                  minHeight: 44,
                  width: "100%", border: "none",
                  background: isActive ? T.accentSurface : "transparent",
                  borderRadius: SHAPE.radiusSm,
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                  transition: "background .1s",
                }}
              >
                <span style={{ display: "flex", color: isActive ? T.accent : T.textTertiary, flexShrink: 0 }}>
                  <Icon />
                </span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.text, letterSpacing: "-.015em" }}>
                  {label}
                </span>
                {id === "manage-feeds" && feedErrorCount > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, lineHeight: 1,
                    minWidth: 22, height: 19, borderRadius: 10,
                    background: T.danger + "22", color: T.danger,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 6px", boxSizing: "border-box", flexShrink: 0,
                  }}>
                    {feedErrorCount > 99 ? "99+" : feedErrorCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
