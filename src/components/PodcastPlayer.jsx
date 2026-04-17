// ── PodcastPlayer — Pocket Casts-style ───────────────────────────────
// Mobile: mini-bar above BottomNav, tap to expand full-screen
// Desktop: centered modal with volume + improved layout
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

// ── Seekbar with draggable thumb ──────────────────────────────────────
function SeekBar({ progress, currentTime, duration, seekTo, T, light }) {
  const trackRef   = useRef(null);
  const dragging   = useRef(false);
  const durRef     = useRef(duration);
  const [dragPct, setDragPct] = useState(null);

  useEffect(() => { durRef.current = duration; }, [duration]);

  function getPct(e) {
    if (!trackRef.current) return 0;
    const rect   = trackRef.current.getBoundingClientRect();
    const touch  = e.changedTouches?.[0] || e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function onStart(e) {
    e.preventDefault();
    dragging.current = true;
    setDragPct(getPct(e));
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging.current) return;
      e.preventDefault();
      setDragPct(getPct(e));
    }
    function onEnd(e) {
      if (!dragging.current) return;
      dragging.current = false;
      seekTo(getPct(e) * durRef.current);
      setDragPct(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onEnd);
    };
  }, []); // stable — uses refs for duration + seekTo

  const pct   = dragPct !== null ? dragPct : progress;
  const track = light ? "rgba(255,255,255,.2)"  : T.surface2;
  const fill  = light ? "rgba(255,255,255,.9)"  : T.accent;

  return (
    <div>
      <div ref={trackRef} onMouseDown={onStart} onTouchStart={onStart}
        style={{ padding: "8px 0", cursor: "pointer", touchAction: "none" }}
      >
        <div style={{ position: "relative", height: 4, borderRadius: 2, background: track }}>
          <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${pct * 100}%`, background: fill, borderRadius: 2 }} />
          <div style={{
            position: "absolute", top: "50%", left: `${pct * 100}%`,
            transform: "translate(-50%, -50%)",
            width: dragPct !== null ? 16 : 12, height: dragPct !== null ? 16 : 12,
            borderRadius: "50%", background: fill,
            boxShadow: "0 1px 4px rgba(0,0,0,.4)",
            transition: dragPct !== null ? "none" : "width .1s, height .1s",
            pointerEvents: "none",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: light ? "rgba(255,255,255,.5)" : T.textTertiary }}>{fmt(currentTime)}</span>
        <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: light ? "rgba(255,255,255,.5)" : T.textTertiary }}>{fmt(duration)}</span>
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
      <div onClick={handleClick} style={{ flex: 1, position: "relative", height: 4, borderRadius: 2, background: track, cursor: "pointer" }}>
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
  const audioRef     = useRef(null);

  const [expanded,    setExpanded]  = useState(false);
  const [playing,     setPlaying]   = useState(false);
  const [progress,    setProgress]  = useState(0);
  const [currentTime, setCT]        = useState(0);
  const [duration,    setDuration]  = useState(0);
  const [loading,     setLoading]   = useState(true);
  const [rate,        setRate]      = useState(1);
  const [volume,      setVolume]    = useState(1);
  const [sleepTimer,  setSleep]     = useState(null);
  const sleepRef = useRef(null);

  // Persist seek position per episode
  const posKey = item?.audioUrl ? `fb-pod-pos-${btoa(item.audioUrl).slice(0,32)}` : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      setLoading(false);
      setDuration(audio.duration || 0);
      // Restore saved position
      if (posKey) {
        const saved = parseFloat(localStorage.getItem(posKey) || "0");
        if (saved > 10 && saved < (audio.duration || 0) - 10) audio.currentTime = saved;
      }
    };
    const onTime = () => {
      setCT(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
      if (posKey) {
        try { localStorage.setItem(posKey, audio.currentTime.toString()); } catch {}
      }
    };
    const onEnded   = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate",     onTime);
    audio.addEventListener("ended",          onEnded);
    audio.addEventListener("waiting",        onWaiting);
    audio.addEventListener("canplay",        onCanPlay);
    return () => {
      clearInterval(sleepRef.current);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate",     onTime);
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("waiting",        onWaiting);
      audio.removeEventListener("canplay",        onCanPlay);
    };
  }, [item?.audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(console.error); }
  }

  function seekTo(time) {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, Math.min(duration, time));
  }

  function skip(secs) { seekTo(currentTime + secs); }

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

  const seekProps = { progress, currentTime, duration, seekTo, T };

  // ── MOBILE ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <audio ref={audioRef} src={item.audioUrl} preload="metadata" />

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
                  <SeekBar {...seekProps} light />
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
                  <button onClick={toggleSleep} title={sleepTimer ? `Sleep in ${sleepTimer}m` : "Sleep timer"} style={{
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
          {/* Progress strip */}
          <div style={{ height: 3, background: T.surface2 }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: T.accent, transition: "width .2s linear" }} />
          </div>
          {/* Row */}
          <div
            onClick={() => setExpanded(true)}
            style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 12, cursor: "pointer" }}
          >
            {item.image
              ? <img src={item.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
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

  // ── DESKTOP — modal ───────────────────────────────────────────────
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.5)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        animation: "fadeIn .2s ease",
      }}
    >
      <audio ref={audioRef} src={item.audioUrl} preload="metadata" />

      <div style={{
        width: 500, borderRadius: 24, overflow: "hidden",
        background: T.card,
        boxShadow: "0 40px 120px rgba(0,0,0,.55), 0 0 0 .5px rgba(255,255,255,.06)",
        animation: "slideUp .28s cubic-bezier(.22,.8,.36,1)",
      }}>
        {/* Artwork header */}
        <div style={{ position: "relative", height: 230, background: T.surface2, overflow: "hidden" }}>
          {item.image
            ? <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${T.accent}22, ${T.surface2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArtworkPlaceholder size={100} radius={12} T={T} />
              </div>
          }
          {/* Gradient fade to card bg */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, background: `linear-gradient(to bottom, transparent, ${T.card})` }} />
          {/* Close */}
          <button onClick={onClose} aria-label="Close player" style={{
            position: "absolute", top: 12, right: 12,
            width: 32, height: 32, borderRadius: "50%", border: "none",
            background: "rgba(0,0,0,.35)", backdropFilter: "blur(8px)",
            cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .12s",
          }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,.6)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(0,0,0,.35)"}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div style={{ padding: "16px 28px 26px" }}>
          {/* Title + source */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1.35, marginBottom: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {item.title}
            </div>
            <div style={{ fontSize: 12, color: T.textTertiary, fontWeight: 500 }}>{item.source}</div>
          </div>

          {/* Seekbar */}
          <div style={{ marginBottom: 20 }}>
            <SeekBar {...seekProps} light={false} />
          </div>

          {/* Main controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            <SkipBtn secs={-SKIP_BCK} onClick={() => skip(-SKIP_BCK)} T={T} light={false} />
            <PlayBtn size={62} playing={playing} loading={loading} onClick={togglePlay} T={T} light={false} />
            <SkipBtn secs={SKIP_FWD}  onClick={() => skip(SKIP_FWD)}  T={T} light={false} />
          </div>

          {/* Secondary controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={cycleRate} style={{
              background: rate !== 1 ? T.accentSurface : T.surface2,
              border: "none", borderRadius: 8, padding: "6px 11px",
              cursor: "pointer", fontSize: 12, fontWeight: 700,
              color: rate !== 1 ? T.accent : T.textSecondary,
              fontFamily: "inherit", minWidth: 44, textAlign: "center", transition: "background .12s",
            }}>{rate}×</button>
            <VolumeSlider volume={volume} onChange={changeVolume} T={T} light={false} />
            <button onClick={toggleSleep} title={sleepTimer ? `Sleep in ${sleepTimer}m` : "Sleep timer (30 min)"} style={{
              background: sleepTimer ? T.accentSurface : T.surface2,
              border: "none", borderRadius: 8, padding: "6px 10px",
              cursor: "pointer", fontSize: sleepTimer ? 12 : 15, fontWeight: 700,
              color: sleepTimer ? T.accent : T.textTertiary,
              fontFamily: "inherit", minWidth: 44, textAlign: "center", transition: "background .12s",
            }}>{sleepTimer ? `${sleepTimer}m` : "💤"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
