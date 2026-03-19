import { Component } from "react";
import { useTheme } from "../hooks/useTheme";

export function Card({ children, style = {}, onClick }) {
  const { T } = useTheme();
  return (
    <div onClick={onClick} style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "16px 18px",
      boxShadow: "0 1px 3px rgba(0,0,0,.05)",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow .15s, border-color .15s", ...style,
    }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.1)"; e.currentTarget.style.borderColor = T.borderStrong; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.05)"; e.currentTarget.style.borderColor = T.border; } : undefined}
    >{children}</div>
  );
}

export function Button({ children, onClick, variant = "primary", size = "md", disabled = false, style = {} }) {
  const { T } = useTheme();
  const base = {
    border: "none", borderRadius: 10, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "opacity .15s", opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
  };
  const sizes = { sm: { padding: "6px 12px", fontSize: 12 }, md: { padding: "9px 16px", fontSize: 13 }, lg: { padding: "12px 22px", fontSize: 15 } };
  const variants = {
    primary:   { background: T.accent,   color: "#fff" },
    secondary: { background: T.surface2, color: T.text, border: `1px solid ${T.border}` },
    ghost:     { background: "transparent", color: T.textSecondary },
    danger:    { background: T.danger,   color: "#fff" },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? "0.5" : "1"; }}
    >{children}</button>
  );
}

export function Badge({ children, color = "blue" }) {
  const { T } = useTheme();
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
      background: T[color]?.bg || T.accentSurface,
      color: T[color]?.text || T.accentText,
    }}>{children}</span>
  );
}

export function Input({ value, onChange, placeholder, onKeyDown, style = {}, autoFocus }) {
  const { T } = useTheme();
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onKeyDown={onKeyDown} autoFocus={autoFocus}
      style={{
        width: "100%", background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: "10px 14px", fontSize: 14, color: T.text,
        fontFamily: "inherit", outline: "none", boxSizing: "border-box", ...style,
      }}
      onFocus={e => { e.target.style.borderColor = T.accent; }}
      onBlur={e => { e.target.style.borderColor = T.border; }}
    />
  );
}

export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, border: "2px solid #e2e8f0",
      borderTop: "2px solid #2F6FED", borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  const { T } = useTheme();
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: T.textSecondary }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: action ? 20 : 0 }}>{subtitle}</div>
      {action}
    </div>
  );
}

// ── Error Boundary ────────────────────────────────────────────
// Catches any uncaught render error and shows a recovery screen.
// Usage: wrap any subtree in <ErrorBoundary>...</ErrorBoundary>
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const reload = () => { this.setState({ hasError: false, error: null }); window.location.reload(); };
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, textAlign: "center",
        background: "var(--bg, #F5F6F7)", minHeight: "100dvh",
      }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#1A2124", marginBottom: 8 }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 13, color: "#666", maxWidth: 320, lineHeight: 1.6, marginBottom: 24 }}>
          {this.state.error?.message || "An unexpected error occurred."}
        </div>
        <button onClick={reload} style={{
          background: "#4BBFAF", color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit",
        }}>Reload app</button>
        {this.props.onReset && (
          <button onClick={this.props.onReset} style={{
            background: "transparent", color: "#666", border: "none",
            fontSize: 12, cursor: "pointer", marginTop: 10, fontFamily: "inherit",
          }}>Try without reloading</button>
        )}
      </div>
    );
  }
}
