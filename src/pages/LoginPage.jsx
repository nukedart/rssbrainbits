import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/UI";

const VERSION = "1.1.0";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { T, isDark } = useTheme();

  return (
    <div style={{
      minHeight: "100vh",
      background: isDark ? "#1E2528" : "#F5F6F7",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>

        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <img
            src={`${import.meta.env.BASE_URL}feedbox-logo.png`}
            alt="Feedbox"
            style={{
              height: 36,
              filter: isDark ? "none" : "invert(1) brightness(0.2)",
            }}
            onError={e => { e.target.style.display = "none"; }}
          />
        </div>

        <p style={{ fontSize: 15, color: T.textSecondary, margin: "0 0 8px", lineHeight: 1.6 }}>
          Your calm reading space.
        </p>
        <p style={{ fontSize: 13, color: T.textTertiary, margin: "0 0 36px", lineHeight: 1.6 }}>
          RSS feeds, articles, and YouTube — beautifully organized.
        </p>

        {/* Feature list */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: "18px 20px", marginBottom: 28, textAlign: "left",
        }}>
          {[
            { icon: "📡", text: "Subscribe to any RSS or Atom feed" },
            { icon: "📰", text: "Read articles distraction-free" },
            { icon: "▶️", text: "Watch YouTube with AI summaries" },
            { icon: "✨", text: "AI-powered article summaries" },
            { icon: "✍️", text: "Highlight passages and add notes" },
            { icon: "⏱",  text: "Read later queue + full history" },
            { icon: "🏷",  text: "Tag and organize your reading" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", gap: 12, padding: "6px 0", alignItems: "center" }}>
              <span style={{ fontSize: 15 }}>{icon}</span>
              <span style={{ fontSize: 13, color: T.textSecondary }}>{text}</span>
            </div>
          ))}
        </div>

        <Button onClick={signIn} size="lg" style={{
          width: "100%", justifyContent: "center", gap: 10,
          background: T.accent, boxShadow: `0 4px 16px ${T.accent}55`,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Continue with GitHub
        </Button>

        <p style={{ fontSize: 11, color: T.textTertiary, marginTop: 16 }}>
          Free · No credit card · Your data stays yours
        </p>
        <p style={{ fontSize: 10, color: T.textTertiary, marginTop: 8, opacity: 0.6 }}>
          v{VERSION}
        </p>
      </div>
    </div>
  );
}
