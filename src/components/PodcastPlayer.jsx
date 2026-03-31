import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useBreakpoint } from "../hooks/useBreakpoint";

// ── Helper components (outside PodcastPlayer to avoid remount on each render) ──

function PlayBtn({ size = 64, playing, loading, togglePlay, T }) {
  return (
    <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} style={{
      width: size, height: size, borderRadius: "50%", border: "none",
      background: T.accent, color: T.accentText,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 8px 32px ${T.accent}60`, flexShrink: 0,
      transition: "transform .12s, box-shadow .12s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform="scale(1.06)"; e.currentTarget.style.boxShadow=`0 12px 40px ${T.accent}80`; }}
      onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow=`0 8px 32px ${T.accent}60`; }}
    >
      {loading
        ? <span style={{ width: size*.28, height: size*.28, border: `2px solid ${T.accentText}`, borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin .7s linear infinite" }} />
        : playing
          ? <svg width={size*.28} height={size*.32} viewBox="0 0 12 14" fill={T.accentText}><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
          : <svg width={size*.28} height={size*.32} viewBox="0 0 12 14" fill={T.accentText}><path d="M2 1l10 6-10 6V1z"/></svg>
      }
    </button>
  );
}

function SkipBtn({ secs, skip, light, T }) {
  const col  = light ? "rgba(255,255,255,0.85)" : T.textSecondary;
  const colH = light ? "#fff" : T.text;
  const bgH  = light ? "rgba(255,255,255,0.1)" : T.surface2;
  return (
    <button onClick={() => skip(secs)} aria-label={`${secs > 0 ? "Forward" : "Back"} ${Math.abs(secs)} seconds`} style={{
      background: "none", border: "none", cursor: "pointer", padding: 10,
      color: col, display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "50%", transition: "background .12s, color .12s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background=bgH; e.currentTarget.style.color=colH; }}
      onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color=col; }}
    >
      {secs < 0
        ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.12"/>
            <text x="6.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">{Math.abs(secs)}</text>
          </svg>
        : <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-.49-3.12"/>
            <text x="6.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">{secs}</text>
          </svg>
      }
    </button>
  );
}

function SeekBar({ progress, currentTime, duration, seek, light, T, fmt }) {
  return (
    <div>
      <div onClick={seek} style={{
        height: 4, borderRadius: 2, cursor: "pointer", position: "relative",
        background: light ? "rgba(255,255,255,0.2)" : T.surface2,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: `${progress * 100}%`,
          background: light ? "rgba(255,255,255,0.9)" : `linear-gradient(90deg,${T.accent},${T.accentHover||T.accent})`,
          borderRadius: 2, transition: "width .1s linear",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: light ? "rgba(255,255,255,0.6)" : T.textTertiary }}>{fmt(currentTime)}</span>
        <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: light ? "rgba(255,255,255,0.6)" : T.textTertiary }}>{fmt(duration)}</span>
      </div>
    </div>
  );
}

function RateBtn({ rate, cycleRate, light, T }) {
  return (
    <button onClick={cycleRate} title="Playback speed" style={{
      background: light
        ? (rate !== 1 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)")
        : (rate !== 1 ? T.accentSurface : T.surface2),
      border: "none", borderRadius: 8, padding: "6px 10px",
      cursor: "pointer", fontSize: 12, fontWeight: 700,
      color: light
        ? (rate !== 1 ? "#fff" : "rgba(255,255,255,0.7)")
        : (rate !== 1 ? T.accent : T.textSecondary),
      fontFamily: "inherit", minWidth: 44, textAlign: "center", transition: "background .12s",
    }}>{rate}×</button>
  );
}

function SleepBtn({ sleepTimer, toggleSleep, light, T }) {
  return (
    <button onClick={toggleSleep} title={sleepTimer ? `Sleep in ${sleepTimer}m` : "Sleep timer (30 min)"} style={{
      background: light
        ? (sleepTimer ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)")
        : (sleepTimer ? T.accentSurface : T.surface2),
      border: "none", borderRadius: 8, padding: "6px 10px",
      cursor: "pointer", fontSize: sleepTimer ? 12 : 14, fontWeight: 700,
      color: light
        ? (sleepTimer ? "#fff" : "rgba(255,255,255,0.7)")
        : (sleepTimer ? T.accent : T.textTertiary),
      fontFamily: "inherit", minWidth: 44, textAlign: "center", transition: "background .12s",
    }}>{sleepTimer ? `${sleepTimer}m` : "💤"}</button>
  );
}

// ── Podcast Player — centered modal (desktop) / full-screen (mobile) ──
// Props: item { title, source, audioUrl, audioDuration, image }
//        onClose — dismiss the player
export default function PodcastPlayer({ item, onClose }) {
  const { T } = useTheme();
  const { isMobile } = useBreakpoint();
  const audioRef = useRef(null);
  const [playing, setPlaying]         = useState(false);
  const [progress, setProgress]       = useState(0);    // 0–1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [loading, setLoading]         = useState(true);
  const [rate, setRate]               = useState(1);
  const [sleepTimer, setSleepTimer]   = useState(null);
  const sleepRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded  = () => { setLoading(false); setDuration(audio.duration || 0); };
    const onTime    = () => { setCurrentTime(audio.currentTime); setProgress(audio.duration ? audio.currentTime / audio.duration : 0); };
    const onEnded   = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      clearInterval(sleepRef.current);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [item?.audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(console.error); }
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }

  function skip(secs) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + secs));
  }

  function cycleRate() {
    const RATES = [1, 1.25, 1.5, 1.75, 2];
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function toggleSleep() {
    if (sleepTimer) {
      clearInterval(sleepRef.current);
      setSleepTimer(null);
    } else {
      setSleepTimer(30);
      const end = Date.now() + 30 * 60000;
      sleepRef.current = setInterval(() => {
        const left = Math.round((end - Date.now()) / 60000);
        if (left <= 0) {
          audioRef.current?.pause();
          setPlaying(false);
          setSleepTimer(null);
          clearInterval(sleepRef.current);
        } else {
          setSleepTimer(left);
        }
      }, 30000);
    }
  }

  function fmt(s) {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${m}:${String(sec).padStart(2,"0")}`;
  }

  if (!item?.audioUrl) return null;

  // shared props bundles
  const shared = { T, playing, loading, togglePlay, seek, skip, cycleRate, toggleSleep, rate, sleepTimer, progress, currentTime, duration, fmt };

  // ── MOBILE — full screen ─────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "#0e0e0f",
        display: "flex", flexDirection: "column",
        animation: "slideUp .28s cubic-bezier(.22,.8,.36,1)",
      }}>
        <audio ref={audioRef} src={item.audioUrl} preload="metadata" />

        {/* Blurred background art */}
        {item.image && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${item.image})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(48px) saturate(1.4)",
            transform: "scale(1.15)",
            opacity: 0.35,
          }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)" }} />

        {/* Content */}
        <div style={{
          position: "relative", flex: 1,
          display: "flex", flexDirection: "column",
          paddingTop: "env(safe-area-inset-top, 20px)",
          paddingBottom: "env(safe-area-inset-bottom, 32px)",
        }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 0" }}>
            <button onClick={onClose} aria-label="Close player" style={{
              background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer",
              width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              Now Playing
            </div>
            <RateBtn {...shared} light />
          </div>

          {/* Artwork */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 40px" }}>
            {item.image
              ? <img src={item.image} alt={item.title} style={{
                  width: "100%", maxWidth: 300, aspectRatio: "1/1",
                  borderRadius: 24, objectFit: "cover",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                }} />
              : <div style={{
                  width: 260, height: 260, borderRadius: 24,
                  background: `linear-gradient(135deg, ${T.accent}40, ${T.accent}10)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1" strokeLinecap="round" opacity={0.6}>
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  </svg>
                </div>
            }
          </div>

          {/* Info + controls */}
          <div style={{ padding: "0 28px 8px" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{item.source}</div>
            </div>

            {/* Seek */}
            <div style={{ marginBottom: 24 }}>
              <SeekBar {...shared} light />
            </div>

            {/* Main controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
              <SkipBtn secs={-15} {...shared} light />
              <PlayBtn size={72} {...shared} />
              <SkipBtn secs={30} {...shared} light />
            </div>

            {/* Secondary */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <SleepBtn {...shared} light />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP — centered modal ─────────────────────────────────
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: "fadeIn .2s ease",
      }}
    >
      <audio ref={audioRef} src={item.audioUrl} preload="metadata" />

      <div style={{
        width: 440, borderRadius: 28, overflow: "hidden",
        background: T.card,
        boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06)",
        animation: "slideUp .28s cubic-bezier(.22,.8,.36,1)",
        position: "relative",
      }}>
        {/* Artwork header */}
        <div style={{ position: "relative", height: 240, background: T.surface2, overflow: "hidden" }}>
          {item.image
            ? <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{
                width: "100%", height: "100%",
                background: `linear-gradient(135deg, ${T.accent}25, ${T.surface2})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1" strokeLinecap="round" opacity={0.4}>
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
              </div>
          }
          {/* Gradient fade to card background */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to bottom, transparent, ${T.card})` }} />

          {/* Close */}
          <button onClick={onClose} aria-label="Close player" style={{
            position: "absolute", top: 12, right: 12,
            width: 32, height: 32, borderRadius: "50%", border: "none",
            background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)",
            cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .12s",
          }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,0.6)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(0,0,0,0.35)"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Controls panel */}
        <div style={{ padding: "20px 28px 28px" }}>
          {/* Title & source */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.35, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {item.title}
            </div>
            <div style={{ fontSize: 12, color: T.textTertiary, fontWeight: 500 }}>{item.source}</div>
          </div>

          {/* Seek */}
          <div style={{ marginBottom: 24 }}>
            <SeekBar {...shared} light={false} />
          </div>

          {/* Main controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
            <SkipBtn secs={-15} {...shared} light={false} />
            <PlayBtn size={64} {...shared} />
            <SkipBtn secs={30} {...shared} light={false} />
          </div>

          {/* Secondary controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <RateBtn {...shared} light={false} />
            <SleepBtn {...shared} light={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
