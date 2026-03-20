import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

// ── Podcast Player — glassmorphic sticky bar ─────────────────
// Props: item { title, source, audioUrl, audioDuration, image }
//        onClose — dismiss the player
export default function PodcastPlayer({ item, onClose }) {
  const { T } = useTheme();
  const audioRef = useRef(null);
  const [playing, setPlaying]         = useState(false);
  const [progress, setProgress]       = useState(0);    // 0–1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [loading, setLoading]         = useState(true);
  const [rate, setRate]               = useState(1);
  const [sleepTimer, setSleepTimer]   = useState(null);
  const [expanded, setExpanded]       = useState(false);
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

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      background: `${T.surface}e8`,
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      boxShadow: "0 -1px 0 rgba(255,255,255,.04), 0 -8px 32px rgba(0,0,0,.24)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <audio ref={audioRef} src={item.audioUrl} preload="metadata" />

      {/* Seek bar — full width, thin */}
      <div onClick={seek} style={{ height: 3, background: T.surface2, cursor: "pointer", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0, right: `${(1-progress)*100}%`,
          background: `linear-gradient(90deg, ${T.accent}, ${T.accentHover})`,
          transition: "right .1s linear",
        }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
        {/* Artwork — tap to expand details */}
        {item.image && (
          <button onClick={() => setExpanded(v => !v)} style={{
            background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
          }}>
            <img src={item.image} alt="" style={{
              width: 44, height: 44, borderRadius: 10, objectFit: "cover",
              boxShadow: "0 2px 8px rgba(0,0,0,.3)",
              opacity: expanded ? 1 : 0.9,
              transition: "opacity .15s",
            }} />
          </button>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2, display: "flex", gap: 6 }}>
            <span>{item.source}</span>
            <span>·</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(currentTime)}</span>
            <span>/</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {/* Skip back 15s */}
          <Btn onClick={() => skip(-15)} T={T} title="Back 15s">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.12"/>
              <text x="7" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">15</text>
            </svg>
          </Btn>

          {/* Play/Pause */}
          <button onClick={togglePlay} style={{
            width: 40, height: 40, borderRadius: "50%", border: "none",
            background: T.accent, color: T.accentText,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0, marginLeft: 2, marginRight: 2,
            boxShadow: `0 0 12px ${T.accent}40`,
          }}>
            {loading
              ? <span style={{ width: 14, height: 14, border: `2px solid ${T.accentText}`, borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin .7s linear infinite" }} />
              : playing
                ? <svg width="12" height="14" viewBox="0 0 12 14" fill={T.accentText}><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
                : <svg width="12" height="14" viewBox="0 0 12 14" fill={T.accentText}><path d="M2 1l10 6-10 6V1z"/></svg>
            }
          </button>

          {/* Skip forward 30s */}
          <Btn onClick={() => skip(30)} T={T} title="Forward 30s">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-.49-3.12"/>
              <text x="7" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">30</text>
            </svg>
          </Btn>

          {/* Playback rate */}
          <button onClick={cycleRate} title="Playback speed" style={{
            background: rate !== 1 ? T.accentSurface : T.surface2,
            border: "none", borderRadius: 6, padding: "5px 7px",
            cursor: "pointer", fontSize: 11, fontWeight: 700,
            color: rate !== 1 ? T.accent : T.textSecondary,
            fontFamily: "inherit", minWidth: 38, textAlign: "center",
          }}>{rate}×</button>

          {/* Sleep timer */}
          <button onClick={toggleSleep} title={sleepTimer ? `Sleep in ${sleepTimer}m` : "Sleep timer (30 min)"} style={{
            background: sleepTimer ? T.accentSurface : T.surface2,
            border: "none", borderRadius: 6, padding: "5px 7px",
            cursor: "pointer", fontSize: 10, fontWeight: 700,
            color: sleepTimer ? T.accent : T.textTertiary,
            fontFamily: "inherit", minWidth: 32, textAlign: "center",
          }}>
            {sleepTimer ? `${sleepTimer}m` : "💤"}
          </button>

          {/* Close */}
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.textTertiary, fontSize: 18, padding: "0 4px", lineHeight: 1, marginLeft: 2,
          }}
            onMouseEnter={e => e.currentTarget.style.color=T.danger}
            onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
          >×</button>
        </div>
      </div>
    </div>
  );
}

// small icon button
function Btn({ children, onClick, T, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: "none", border: "none", cursor: "pointer",
      color: T.textSecondary, padding: "6px", borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
      onMouseEnter={e => { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.text; }}
      onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color=T.textSecondary; }}
    >{children}</button>
  );
}
