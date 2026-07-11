// ── PodcastPlayer — Pocket Casts-style ───────────────────────────────
// Mobile: mini-bar above BottomNav, tap to expand full-screen
// Desktop: persistent mini-bar (bottom-right), expand for full controls
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useBreakpoint } from "../hooks/useBreakpoint";

const RATES    = [1, 1.25, 1.5, 1.75, 2];
const SKIP_BCK = 15;
const SKIP_FWD = 30;

function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

// ── SeekBar — fully ref-driven via RAF, zero React re-renders during playback
function SeekBar({ audioRef, T, light }) {
  const trackRef = useRef(null);
  const fillRef  = useRef(null);
  const thumbRef = useRef(null);
  const ctRef    = useRef(null);
  const durRef   = useRef(null);
  const dragging = useRef(false);

  // RAF loop — updates DOM directly without touching React state
  // Throttled to ~2fps (500ms) — more than enough for a podcast seek bar.
  // Only runs while audio is actually playing — paused/idle sessions (the
  // majority of a podcast player's mounted lifetime) burn zero frames.
  useEffect(() => {
    const audio = audioRef.current;
    let raf = null;
    let lastTs = 0;

    function tick(ts) {
      if (!dragging.current && ts - lastTs >= 500) {
        lastTs = ts;
        if (audio) {
          const ct  = audio.currentTime || 0;
          const dur = audio.duration    || 0;
          const pct = dur ? ct / dur : 0;
          if (fillRef.current)  fillRef.current.style.transform = `scaleX(${pct})`;
          if (thumbRef.current) thumbRef.current.style.left    = `${pct * 100}%`;
          if (ctRef.current)    ctRef.current.textContent      = fmt(ct);
          if (durRef.current)   durRef.current.textContent     = fmt(dur);
          if (trackRef.current) trackRef.current.setAttribute("aria-valuenow", Math.round(pct * 100));
        }
      }
      if (audio && !audio.paused) raf = requestAnimationFrame(tick);
      else raf = null;
    }
    function start() {
      if (raf == null) raf = requestAnimationFrame(tick);
    }

    start();
    audio?.addEventListener("play",    start);
    audio?.addEventListener("playing", start);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      audio?.removeEventListener("play",    start);
      audio?.removeEventListener("playing", start);
    };
  }, []); // audioRef is a stable ref object

  function getPct(e) {
    if (!trackRef.current) return 0;
    const rect    = trackRef.current.getBoundingClientRect();
    const touch   = e.changedTouches?.[0] || e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function onStart(e) {
    e.preventDefault();
    dragging.current = true;
    if (thumbRef.current) {
      thumbRef.current.style.transform  = "translate(-50%, -50%) scale(1.333)";
      thumbRef.current.style.transition = "none";
    }
    const pct = getPct(e);
    if (fillRef.current)  fillRef.current.style.transform = `scaleX(${pct})`;
    if (thumbRef.current) thumbRef.current.style.left  = `${pct * 100}%`;
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging.current) return;
      e.preventDefault();
      const pct = getPct(e);
      if (fillRef.current)  fillRef.current.style.transform = `scaleX(${pct})`;
      if (thumbRef.current) thumbRef.current.style.left  = `${pct * 100}%`;
    }
    function onEnd(e) {
      if (!dragging.current) return;
      dragging.current = false;
      if (thumbRef.current) {
        thumbRef.current.style.transform  = "translate(-50%, -50%) scale(1)";
        thumbRef.current.style.transition = "transform .1s";
      }
      const audio = audioRef.current;
      if (audio) audio.currentTime = getPct(e) * (audio.duration || 0);
    }
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseup",    onEnd);
    window.addEventListener("touchmove",  onMove, { passive: false });
    window.addEventListener("touchend",   onEnd);
    return () => {
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseup",    onEnd);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("touchend",   onEnd);
    };
  }, []);

  const track = light ? "rgba(255,255,255,.2)" : T.surface2;
  const fill  = light ? "rgba(255,255,255,.9)" : T.accent;

  return (
    <div>
      <div ref={trackRef} onMouseDown={onStart} onTouchStart={onStart}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        onKeyDown={e => {
          const audio = audioRef.current;
          if (!audio) return;
          const step = 5;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + step); }
          else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - step); }
          else if (e.key === "Home") { e.preventDefault(); audio.currentTime = 0; }
          else if (e.key === "End") { e.preventDefault(); audio.currentTime = audio.duration || 0; }
        }}
        style={{ padding: "8px 0", cursor: "pointer", touchAction: "none" }}
      >
        <div style={{ position: "relative", height: 4, borderRadius: 2, background: track, overflow: "hidden" }}>
          <div ref={fillRef} style={{ position: "absolute", inset: "0 0 0 0", background: fill, borderRadius: 2, transform: "scaleX(0)", transformOrigin: "left" }} />
          <div ref={thumbRef} style={{
            position: "absolute", top: "50%", left: "0%",
            transform: "translate(-50%, -50%) scale(1)",
            width: 12, height: 12,
            borderRadius: "50%", background: fill,
            boxShadow: "0 1px 4px rgba(0,0,0,.4)",
            transition: "transform .1s",
            pointerEvents: "none",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span ref={ctRef}  style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: light ? "rgba(255,255,255,.5)" : T.textTertiary }}>0:00</span>
        <span ref={durRef} style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: light ? "rgba(255,255,255,.5)" : T.textTertiary }}>0:00</span>
      </div>
    </div>
  );
}

// ── Play / Pause ──────────────────────────────────────────────────────
function PlayBtn({ size = 56, playing, loading, onClick, T, light }) {
  return (
    <button onClick={onClick} aria-label={playing ? "Pause" : "Play"} style={{
      width: size, height: size, borderRadius: "50%", border: "none",
      background: light ? "rgba(255,255,255,.95)" : T.accent,
      color: light ? "#111" : T.accentText,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: light ? "0 4px 24px rgba(0,0,0,.45)" : `0 4px 20px ${T.accent}55`,
      flexShrink: 0, transition: "transform .1s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform="scale(1.06)"}
      onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
      onTouchStart={e => e.currentTarget.style.transform="scale(0.93)"}
      onTouchEnd={e => e.currentTarget.style.transform="scale(1)"}
      onTouchCancel={e => e.currentTarget.style.transform="scale(1)"}
    >
      {loading
        ? <span style={{ width: size*.28, height: size*.28, border: `2px solid currentColor`, borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin .7s linear infinite" }} />
        : playing
          ? <svg width={size*.28} height={size*.32} viewBox="0 0 12 14" fill="currentColor"><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
          : <svg width={size*.28} height={size*.32} viewBox="0 0 12 14" fill="currentColor"><path d="M2 1l10 6-10 6V1z"/></svg>
      }
    </button>
  );
}

// ── Skip button ───────────────────────────────────────────────────────
function SkipBtn({ secs, onClick, light, T }) {
  const col = light ? "rgba(255,255,255,.8)" : T.textSecondary;
  return (
    <button onClick={onClick} aria-label={`${secs > 0 ? "Skip forward" : "Skip back"} ${Math.abs(secs)} seconds`}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: col, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", transition: "opacity .1s" }}
      onMouseEnter={e => e.currentTarget.style.opacity=".65"}
      onMouseLeave={e => e.currentTarget.style.opacity="1"}
      onTouchStart={e => e.currentTarget.style.opacity=".45"}
      onTouchEnd={e => e.currentTarget.style.opacity="1"}
      onTouchCancel={e => e.currentTarget.style.opacity="1"}
    >
      {secs < 0
        ? <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.12"/>
            <text x="6.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">{Math.abs(secs)}</text>
          </svg>
        : <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-.49-3.12"/>
            <text x="6.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">{secs}</text>
          </svg>
      }
    </button>
  );
}

// ── Volume slider ─────────────────────────────────────────────────────
function VolumeSlider({ volume, onChange, T, light }) {
  const pct   = volume * 100;
  const fill  = light ? "rgba(255,255,255,.9)"  : T.accent;
  const track = light ? "rgba(255,255,255,.2)"  : T.surface2;

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        style={{ color: light ? "rgba(255,255,255,.45)" : T.textTertiary, flexShrink: 0 }}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
      <div
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(1, volume + 0.05)); }
          else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(0, volume - 0.05)); }
        }}
        style={{ flex: 1, position: "relative", height: 4, borderRadius: 2, background: track, cursor: "pointer" }}
      >
        <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${pct}%`, background: fill, borderRadius: 2 }} />
        <div style={{
          position: "absolute", top: "50%", left: `${pct}%`,
          transform: "translate(-50%,-50%)",
          width: 10, height: 10, borderRadius: "50%", background: fill,
          boxShadow: "0 1px 3px rgba(0,0,0,.3)", pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}

// ── Artwork placeholder ───────────────────────────────────────────────
function ArtworkPlaceholder({ size, radius, T }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: `linear-gradient(135deg, ${T.accent}35, ${T.accent}0a)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size * .32} height={size * .32} viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1" opacity={0.5}>
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function PodcastPlayer({ item, onClose }) {
  const { T }        = useTheme();
  const { isMobile } = useBreakpoint();
  const audioRef       = useRef(null);
  const miniBarFillRef = useRef(null);

  const [expanded,   setExpanded]  = useState(false);
  const [playing,    setPlaying]   = useState(false);
  const [loading,    setLoading]   = useState(true);  // true until canplay — shows spinner immediately
  const [rate,       setRate]      = useState(1);
  const [volume,     setVolume]    = useState(1);
  const [sleepTimer, setSleep]     = useState(null);
  const sleepRef = useRef(null);

  const posKey = item?.audioUrl ? `fb-pod-pos-${btoa(item.audioUrl).slice(0,32)}` : null;

  // Audio event listeners — authoritative source of truth for playing/loading state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded  = () => {
      if (!audio.duration) return;
      if (posKey) {
        const saved = parseFloat(localStorage.getItem(posKey) || "0");
        if (saved > 10 && saved < audio.duration - 10) audio.currentTime = saved;
      }
    };
    const onPlaying = () => { setLoading(false); setPlaying(true); };
    const onPause   = () => { setLoading(false); setPlaying(false); };
    const onEnded   = () => { setLoading(false); setPlaying(false); };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError   = () => setLoading(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("playing",        onPlaying);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("ended",          onEnded);
    audio.addEventListener("waiting",        onWaiting);
    audio.addEventListener("canplay",        onCanPlay);
    audio.addEventListener("error",          onError);

    // Handle already-loaded audio (e.g. switching episodes while loaded)
    if (audio.readyState >= 1 && audio.duration) onLoaded();

    return () => {
      clearInterval(sleepRef.current);
      if (posKey && audio.currentTime > 0) {
        try { localStorage.setItem(posKey, audio.currentTime.toString()); } catch {}
      }
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("playing",        onPlaying);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("waiting",        onWaiting);
      audio.removeEventListener("canplay",        onCanPlay);
      audio.removeEventListener("error",          onError);
    };
  }, [item?.audioUrl]);

  // RAF loop for mini-bar progress strip — throttled to 500ms, and only
  // ticking while actually playing (paused/minimized sessions burn nothing).
  useEffect(() => {
    const audio = audioRef.current;
    let raf = null;
    let lastTs = 0;

    function tick(ts) {
      if (ts - lastTs >= 500) {
        lastTs = ts;
        if (audio && miniBarFillRef.current) {
          const pct = audio.duration ? audio.currentTime / audio.duration : 0;
          miniBarFillRef.current.style.transform = `scaleX(${pct})`;
        }
      }
      if (audio && !audio.paused) raf = requestAnimationFrame(tick);
      else raf = null;
    }
    function start() {
      if (raf == null) raf = requestAnimationFrame(tick);
    }

    start();
    audio?.addEventListener("play",    start);
    audio?.addEventListener("playing", start);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      audio?.removeEventListener("play",    start);
      audio?.removeEventListener("playing", start);
    };
  }, [isMobile]);

  // Auto-play when a new episode is set — user already clicked "Play episode"
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.readyState < 3) setLoading(true); // show spinner immediately if not buffered
    audio.play().catch(() => { setLoading(false); });
  }, [item?.audioUrl]);

  // Persist seek position every 10s (not on every timeupdate).
  // Skipped while paused — the position isn't moving, so re-writing the
  // same value to localStorage every 10s during an idle/paused session
  // (which can last indefinitely while the player stays mounted) is pure waste.
  useEffect(() => {
    if (!posKey) return;
    const id = setInterval(() => {
      const audio = audioRef.current;
      if (audio?.currentTime > 0 && !audio.paused) {
        try { localStorage.setItem(posKey, audio.currentTime.toString()); } catch {}
      }
    }, 10000);
    return () => clearInterval(id);
  }, [posKey]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      setPlaying(true); // optimistic — corrected by playing/pause events if needed
      if (audio.readyState < 3) setLoading(true);
      audio.play().catch(err => {
        console.error(err);
        setPlaying(false);
        setLoading(false);
      });
    }
  }

  function skip(secs) {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + secs));
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function changeVolume(v) {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  function toggleSleep() {
    if (sleepTimer) { clearInterval(sleepRef.current); setSleep(null); return; }
    setSleep(30);
    const end = Date.now() + 30 * 60000;
    sleepRef.current = setInterval(() => {
      const left = Math.round((end - Date.now()) / 60000);
      if (left <= 0) {
        audioRef.current?.pause(); setPlaying(false); setSleep(null); clearInterval(sleepRef.current);
      } else { setSleep(left); }
    }, 30000);
  }

  if (!item?.audioUrl) return null;

  // ── MOBILE ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <audio ref={audioRef} src={item.audioUrl} preload="auto" playsInline />

        {/* ── Full-screen expanded ── */}
        {expanded && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 900,
            background: "#0a0a0b",
            display: "flex", flexDirection: "column",
            animation: "slideUp .3s cubic-bezier(.22,.8,.36,1)",
          }}>
            {/* Blurred artwork bg */}
            {item.image && (
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover", backgroundPosition: "center",
                filter: "blur(60px) saturate(1.7)", transform: "scale(1.2)", opacity: 0.28,
              }} />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,.7) 100%)" }} />

            <div style={{
              position: "relative", flex: 1, display: "flex", flexDirection: "column",
              paddingTop: "env(safe-area-inset-top, 20px)",
              paddingBottom: "env(safe-area-inset-bottom, 24px)",
            }}>
              {/* Top bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 0" }}>
                <button onClick={() => setExpanded(false)} aria-label="Minimize player" style={{
                  background: "rgba(255,255,255,.12)", border: "none", borderRadius: "50%",
                  width: 38, height: 38, cursor: "pointer", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 6l4 4 4-4"/>
                  </svg>
                </button>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.45)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                  Now Playing
                </span>
                <button onClick={cycleRate} style={{
                  background: rate !== 1 ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.1)",
                  border: "none", borderRadius: 8, padding: "6px 11px",
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  color: rate !== 1 ? "#fff" : "rgba(255,255,255,.55)", fontFamily: "inherit",
                }}>{rate}×</button>
              </div>

              {/* Artwork */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 44px" }}>
                {item.image
                  ? <img src={item.image} alt={item.title} style={{
                      width: "100%", maxWidth: 290, aspectRatio: "1/1",
                      borderRadius: 22, objectFit: "cover",
                      boxShadow: "0 28px 72px rgba(0,0,0,.7)",
                      transition: "transform .3s ease",
                      transform: playing ? "scale(1)" : "scale(0.93)",
                    }} />
                  : <ArtworkPlaceholder size={250} radius={22} T={T} />
                }
              </div>

              {/* Info + controls */}
              <div style={{ padding: "0 28px 10px" }}>
                {/* Title + source */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", fontWeight: 500 }}>{item.source}</div>
                </div>

                {/* Seekbar */}
                <div style={{ marginBottom: 16 }}>
                  <SeekBar audioRef={audioRef} T={T} light />
                </div>

                {/* Main controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 20 }}>
                  <SkipBtn secs={-SKIP_BCK} onClick={() => skip(-SKIP_BCK)} T={T} light />
                  <PlayBtn size={72} playing={playing} loading={loading} onClick={togglePlay} T={T} light />
                  <SkipBtn secs={SKIP_FWD}  onClick={() => skip(SKIP_FWD)}  T={T} light />
                </div>

                {/* Secondary: volume + sleep */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <VolumeSlider volume={volume} onChange={changeVolume} T={T} light />
                  <button onClick={toggleSleep} title={sleepTimer ? `Sleep in ${sleepTimer}m` : "Sleep timer"} aria-label={sleepTimer ? `Sleep in ${sleepTimer} minutes` : "Sleep timer"} style={{
                    background: sleepTimer ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.1)",
                    border: "none", borderRadius: 8, padding: "6px 10px",
                    cursor: "pointer", fontSize: sleepTimer ? 12 : 15, fontWeight: 700,
                    color: sleepTimer ? "#fff" : "rgba(255,255,255,.55)",
                    fontFamily: "inherit", minWidth: 44, textAlign: "center",
                  }}>{sleepTimer ? `${sleepTimer}m` : "💤"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Mini-player bar ── */}
        <div style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 82px)",
          left: 8, right: 8,
          zIndex: 800,
          borderRadius: 16,
          background: T.card,
          border: `1px solid ${T.border}`,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 8px 32px rgba(0,0,0,.22)",
          overflow: "hidden",
          transition: "opacity .2s",
          opacity: expanded ? 0 : 1,
          pointerEvents: expanded ? "none" : "auto",
        }}>
          {/* Progress strip — updated via RAF ref, no React state */}
          <div style={{ height: 3, background: T.surface2 }}>
            <div ref={miniBarFillRef} style={{ height: "100%", width: "100%", background: T.accent, transform: "scaleX(0)", transformOrigin: "left" }} />
          </div>
          {/* Row */}
          <div
            onClick={() => setExpanded(true)}
            style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 12, cursor: "pointer" }}
          >
            {item.image
              ? <img src={item.image} alt="" loading="lazy" decoding="async" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              : <ArtworkPlaceholder size={44} radius={8} T={T} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{item.source}</div>
            </div>
            {/* Play/pause */}
            <button onClick={e => { e.stopPropagation(); togglePlay(); }} aria-label={playing ? "Pause" : "Play"} style={{
              width: 38, height: 38, borderRadius: "50%", border: "none",
              background: T.accent, color: T.accentText,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {loading
                ? <span style={{ width: 12, height: 12, border: `2px solid ${T.accentText}`, borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin .7s linear infinite" }} />
                : playing
                  ? <svg width="11" height="13" viewBox="0 0 12 14" fill={T.accentText}><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
                  : <svg width="11" height="13" viewBox="0 0 12 14" fill={T.accentText}><path d="M2 1l10 6-10 6V1z"/></svg>
              }
            </button>
            {/* Close */}
            <button onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Close player" style={{
              width: 30, height: 30, borderRadius: "50%", border: "none",
              background: "transparent", color: T.textTertiary,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── DESKTOP — persistent mini-bar + expandable panel ────────────────
  return (
    <>
      <audio ref={audioRef} src={item.audioUrl} preload="auto" />

      {/* ── Expanded panel — floats above mini bar ── */}
      {expanded && (
        <div style={{
          position: "fixed", bottom: isMobile ? 144 : 80, right: 16,
          zIndex: 1001, width: isMobile ? "calc(100vw - 32px)" : 360,
          borderRadius: 20, overflow: "hidden",
          background: T.card,
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,.45), 0 0 0 .5px rgba(255,255,255,.06)",
          animation: "slideUp .2s cubic-bezier(.22,.8,.36,1)",
        }}>
          {/* Artwork */}
          <div style={{ position: "relative", height: 190, background: T.surface2, overflow: "hidden" }}>
            {item.image
              ? <img src={item.image} alt={item.title} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
              : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${T.accent}22, ${T.surface2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArtworkPlaceholder size={90} radius={12} T={T} />
                </div>
            }
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 70, background: `linear-gradient(to bottom, transparent, ${T.card})` }} />
          </div>
          {/* Controls */}
          <div style={{ padding: "12px 22px 20px" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.3, marginBottom: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500 }}>{item.source}</div>
            </div>
            <div style={{ marginBottom: 14 }}><SeekBar audioRef={audioRef} T={T} light={false} /></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}>
              <SkipBtn secs={-SKIP_BCK} onClick={() => skip(-SKIP_BCK)} T={T} light={false} />
              <PlayBtn size={56} playing={playing} loading={loading} onClick={togglePlay} T={T} light={false} />
              <SkipBtn secs={SKIP_FWD}  onClick={() => skip(SKIP_FWD)}  T={T} light={false} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={cycleRate} style={{
                background: rate !== 1 ? T.accentSurface : T.surface2,
                border: "none", borderRadius: 7, padding: "5px 10px",
                cursor: "pointer", fontSize: 12, fontWeight: 700,
                color: rate !== 1 ? T.accent : T.textSecondary,
                fontFamily: "inherit", minWidth: 40, textAlign: "center",
              }}>{rate}×</button>
              <VolumeSlider volume={volume} onChange={changeVolume} T={T} light={false} />
              <button onClick={toggleSleep} title={sleepTimer ? `Sleep in ${sleepTimer}m` : "Sleep timer (30 min)"} aria-label={sleepTimer ? `Sleep in ${sleepTimer} minutes` : "Sleep timer (30 min)"} style={{
                background: sleepTimer ? T.accentSurface : T.surface2,
                border: "none", borderRadius: 7, padding: "5px 9px",
                cursor: "pointer", fontSize: sleepTimer ? 12 : 15, fontWeight: 700,
                color: sleepTimer ? T.accent : T.textTertiary,
                fontFamily: "inherit", minWidth: 40, textAlign: "center",
              }}>{sleepTimer ? `${sleepTimer}m` : "💤"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mini bar — always visible, non-blocking ── */}
      <div style={{
        position: "fixed", bottom: isMobile ? 80 : 16, right: 16,
        zIndex: 1000, width: isMobile ? "calc(100vw - 32px)" : 360,
        borderRadius: 14,
        background: T.card,
        border: `1px solid ${T.border}`,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        boxShadow: "0 8px 32px rgba(0,0,0,.22)",
        overflow: "hidden",
      }}>
        {/* Progress strip — width must be 100% with transformOrigin left so the
            RAF-driven scaleX() transform actually has something to scale */}
        <div style={{ height: 2, background: T.surface2 }}>
          <div ref={miniBarFillRef} style={{ height: "100%", width: "100%", background: T.accent, transform: "scaleX(0)", transformOrigin: "left" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "9px 10px 9px 12px", gap: 10 }}>
          {/* Artwork */}
          {item.image
            ? <img src={item.image} alt="" loading="lazy" decoding="async" style={{ width: 40, height: 40, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />
            : <ArtworkPlaceholder size={40} radius={7} T={T} />
          }
          {/* Title + source — click opens expanded */}
          <button onClick={() => setExpanded(v => !v)} aria-label={expanded ? "Collapse player" : "Expand player"} aria-expanded={expanded} style={{ flex: 1, minWidth: 0, cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.title}
            </div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{item.source}</div>
          </button>
          {/* Play/pause */}
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} style={{
            width: 36, height: 36, borderRadius: "50%", border: "none",
            background: T.accent, color: T.accentText,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {loading
              ? <span style={{ width: 12, height: 12, border: `2px solid ${T.accentText}`, borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin .7s linear infinite" }} />
              : playing
                ? <svg width="11" height="13" viewBox="0 0 12 14" fill={T.accentText}><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
                : <svg width="11" height="13" viewBox="0 0 12 14" fill={T.accentText}><path d="M2 1l10 6-10 6V1z"/></svg>
            }
          </button>
          {/* Expand / collapse */}
          <button onClick={() => setExpanded(v => !v)} aria-label={expanded ? "Collapse player" : "Expand player"} style={{
            width: 28, height: 28, background: "none", border: "none",
            cursor: "pointer", color: T.textTertiary,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: 6,
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {expanded ? <path d="M4 10l4-4 4 4"/> : <path d="M4 6l4 4 4-4"/>}
            </svg>
          </button>
          {/* Close */}
          <button onClick={onClose} aria-label="Close player" style={{
            width: 28, height: 28, background: "none", border: "none",
            cursor: "pointer", color: T.textTertiary,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: 6,
          }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
