import { useTheme } from "../hooks/useTheme";

const NAV = [
  { id: "inbox",    icon: "📥", label: "Inbox"    },
  { id: "saved",    icon: "🔖", label: "Saved"    },
  { id: "history",  icon: "🕑", label: "History"  },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export default function BottomNav({ active, onNavigate }) {
  const { T } = useTheme();
  return (
    <nav style={{
      borderTop: `1px solid ${T.border}`, background: T.card,
      display: "flex", justifyContent: "space-around",
      paddingBottom: "env(safe-area-inset-bottom, 0px)", flexShrink: 0,
    }}>
      {NAV.map(({ id, icon, label }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => onNavigate(id)} style={{
            flex: 1, padding: "10px 4px", border: "none", background: "none",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? T.accent : T.textTertiary, fontFamily: "inherit" }}>{label}</span>
            {isActive && <div style={{ width: 18, height: 2, borderRadius: 1, background: T.accent, marginTop: -2 }} />}
          </button>
        );
      })}
    </nav>
  );
}
