import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

const VERSION = "1.10.0";

// ── OAuth button ─────────────────────────────────────────────
function OAuthBtn({ onClick, icon, label, T }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try { await onClick(); } catch (e) { setLoading(false); }
  }
  return (
    <button onClick={handle} disabled={loading} style={{
      width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
      padding:"11px 16px", borderRadius:12, border:`1.5px solid ${T.border}`,
      background:T.card, color:T.text, fontSize:14, fontWeight:500,
      cursor:loading?"wait":"pointer", fontFamily:"inherit",
      transition:"all .15s", opacity:loading?0.6:1,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.background=T.accentSurface; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.card; }}
    >
      {icon}
      {loading ? "Connecting…" : label}
    </button>
  );
}

// ── Divider ──────────────────────────────────────────────────
function Divider({ label, T }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, margin:"18px 0" }}>
      <div style={{ flex:1, height:1, background:T.border }} />
      <span style={{ fontSize:12, color:T.textTertiary, whiteSpace:"nowrap" }}>{label}</span>
      <div style={{ flex:1, height:1, background:T.border }} />
    </div>
  );
}

export default function LoginPage() {
  const { signIn, signInWithGoogle, signInWithEmail, signUpWithEmail, sendMagicLink } = useAuth();
  const { T, isDark } = useTheme();

  // "email" | "signup" | "magic" | null (= main screen)
  const [mode, setMode]       = useState(null);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width:"100%", padding:"10px 14px", borderRadius:10,
    border:`1.5px solid ${error ? T.danger : T.border}`,
    background:T.surface, color:T.text, fontSize:14,
    fontFamily:"inherit", boxSizing:"border-box",
    outline:"none", transition:"border-color .15s",
  };

  async function handleEmailAuth(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { user } = await signUpWithEmail(email, password);
        if (!user?.confirmed_at) setSuccess("Check your inbox to confirm your email, then sign in.");
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally { setLoading(false); }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await sendMagicLink(email);
      setSuccess("Magic link sent! Check your email.");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight:"100dvh", background: isDark?"#1E2528":"#F5F6F7",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div style={{ maxWidth:400, width:"100%" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <img
            src={`${import.meta.env.BASE_URL}feedbox-logo.png`}
            alt="Feedbox"
            style={{ height:34, filter: isDark?"none":"invert(1) brightness(0.2)" }}
            onError={e => { e.target.style.display="none"; }}
          />
          <p style={{ fontSize:14, color:T.textSecondary, margin:"10px 0 0", lineHeight:1.5 }}>
            Your calm reading space.
          </p>
        </div>

        {/* Card */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:"24px 22px", boxShadow:"0 4px 24px rgba(0,0,0,.07)" }}>

          {/* ── Email / Sign up form ── */}
          {(mode === "email" || mode === "signup") && (
            <>
              <button onClick={() => { setMode(null); setError(""); setSuccess(""); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, fontSize:13, padding:0, marginBottom:16, display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
                ← Back
              </button>
              <div style={{ fontSize:16, fontWeight:600, color:T.text, marginBottom:18 }}>
                {mode === "signup" ? "Create account" : "Sign in with email"}
              </div>
              {success
                ? <div style={{ background:T.accentSurface, border:`1px solid ${T.accent}`, borderRadius:10, padding:"12px 14px", fontSize:13, color:T.accentText, lineHeight:1.5 }}>{success}</div>
                : (
                  <form onSubmit={handleEmailAuth} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle}
                      onFocus={e => e.target.style.borderColor=T.accent}
                      onBlur={e => e.target.style.borderColor=error?T.danger:T.border}
                    />
                    <input type="password" placeholder={mode==="signup"?"Create password (8+ chars)":"Password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={inputStyle}
                      onFocus={e => e.target.style.borderColor=T.accent}
                      onBlur={e => e.target.style.borderColor=error?T.danger:T.border}
                    />
                    {error && <div style={{ fontSize:12, color:T.danger, lineHeight:1.5 }}>{error}</div>}
                    <button type="submit" disabled={loading} style={{ padding:"11px 0", borderRadius:11, border:"none", background:T.accent, color:"#fff", fontSize:14, fontWeight:600, cursor:loading?"wait":"pointer", fontFamily:"inherit", transition:"opacity .15s", opacity:loading?0.7:1 }}>
                      {loading ? "…" : mode==="signup" ? "Create account" : "Sign in"}
                    </button>
                    <button type="button" onClick={() => { setMode(mode==="signup"?"email":"signup"); setError(""); }}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:T.textTertiary, fontFamily:"inherit", padding:0 }}>
                      {mode==="signup" ? "Already have an account? Sign in" : "No account? Sign up free"}
                    </button>
                  </form>
                )
              }
            </>
          )}

          {/* ── Magic link form ── */}
          {mode === "magic" && (
            <>
              <button onClick={() => { setMode(null); setError(""); setSuccess(""); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, fontSize:13, padding:0, marginBottom:16, display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
                ← Back
              </button>
              <div style={{ fontSize:16, fontWeight:600, color:T.text, marginBottom:6 }}>Passwordless sign in</div>
              <div style={{ fontSize:13, color:T.textSecondary, marginBottom:18, lineHeight:1.5 }}>We'll email you a magic link — no password needed.</div>
              {success
                ? <div style={{ background:T.accentSurface, border:`1px solid ${T.accent}`, borderRadius:10, padding:"12px 14px", fontSize:13, color:T.accentText, lineHeight:1.5 }}>{success}</div>
                : (
                  <form onSubmit={handleMagicLink} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle}
                      onFocus={e => e.target.style.borderColor=T.accent}
                      onBlur={e => e.target.style.borderColor=error?T.danger:T.border}
                    />
                    {error && <div style={{ fontSize:12, color:T.danger }}>{error}</div>}
                    <button type="submit" disabled={loading} style={{ padding:"11px 0", borderRadius:11, border:"none", background:T.accent, color:"#fff", fontSize:14, fontWeight:600, cursor:loading?"wait":"pointer", fontFamily:"inherit", opacity:loading?0.7:1 }}>
                      {loading ? "Sending…" : "Send magic link"}
                    </button>
                  </form>
                )
              }
            </>
          )}

          {/* ── Main screen ── */}
          {!mode && (
            <>
              <OAuthBtn onClick={signIn} T={T}
                label="Continue with GitHub"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>}
              />
              <div style={{ height:10 }} />
              <OAuthBtn onClick={signInWithGoogle} T={T}
                label="Continue with Google"
                icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
              />

              <Divider label="or" T={T} />

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={() => setMode("email")} style={{ padding:"10px 16px", borderRadius:11, border:`1.5px solid ${T.border}`, background:"transparent", color:T.text, fontSize:14, fontWeight:400, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", textAlign:"left" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.background=T.accentSurface; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background="transparent"; }}
                >
                  📧 Sign in with email & password
                </button>
                <button onClick={() => setMode("magic")} style={{ padding:"10px 16px", borderRadius:11, border:`1.5px solid ${T.border}`, background:"transparent", color:T.text, fontSize:14, fontWeight:400, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", textAlign:"left" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.background=T.accentSurface; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background="transparent"; }}
                >
                  ✨ Send me a magic link
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign:"center", fontSize:11, color:T.textTertiary, marginTop:14 }}>
          Free · No credit card · <a href='/terms.html' style={{color:T.textTertiary}} target='_blank'>Terms</a> · <a href='/privacy.html' style={{color:T.textTertiary}} target='_blank'>Privacy</a>
        </p>
      </div>
    </div>
  );
}
