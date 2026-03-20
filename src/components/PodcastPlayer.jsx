import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

// ── Mini podcast player — sticky bar at bottom of content area ─
// Props: item { title, source, audioUrl, audioDuration, image }
//        onClose — dismiss the player
export default function PodcastPlayer({ item, onClose }) {
  const { T } = useTheme();
  const audioRef = useRef(null);
  const [playing, setPlaying]       = useState(false);
  const [progress, setProgress]     = useState(0);   // 0-1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [volume, setVolume]         = useState(1);
  const [loading, setLoading]       = useState(true);
  const [rate, setRate]             = useState(1);
  const [sleepTimer, setSleepTimer] = useState(null); // minutes remaining
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

  function setPlaybackRate(r) {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  function setSleep(mins) {
    clearInterval(sleepRef.current);
    if (!mins) { setSleepTimer(null); return; }
    setSleepTimer(mins);
    const end = Date.now() + mins * 60000;
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
      background: T.card,
      borderTop: `1px solid ${T.border}`,
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      boxShadow: "0 -4px 24px rgba(0,0,0,.12)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <audio ref={audioRef} src={item.audioUrl} preload="metadata" />

      {/* Progress bar — full width, clickable */}
      <div
        onClick={seek}
        style={{ height: 6, background: T.surface2, cursor: "pointer", position: "relative", borderRadius: 0 }}
      >
        <div style={{ position: "absolute", inset: 0, right: `${(1-progress)*100}%`, background: T.accent, transition: "right .1s linear", borderRadius: 0 }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
        {/* Art */}
        {item.image && (
          <img src={item.image} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>
            {item.source} · {fmt(currentTime)} / {fmt(duration)}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {/* Skip back 15s */}
          <button onClick={() => skip(-15)} title="Back 15s"
            style={{ background: "none", border: "none", cursor: "pointer", color: T.textSecondary, fontSize: 11, fontWeight: 600, padding: "4px 6px", borderRadius: 6, fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background=T.surface2}
            onMouseLeave={e => e.currentTarget.style.background="none"}
          >-15</button>

          {/* Play/Pause */}
          <button onClick={togglePlay}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: T.accent, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
            {loading ? (
              <span style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin .7s linear infinite" }} />
            ) : playing ? "⏸" : "▶"}
          </button>

          {/* Skip forward 30s */}
          <button onClick={() => skip(30)} title="Forward 30s"
            style={{ background: "none", border: "none", cursor: "pointer", color: T.textSecondary, fontSize: 11, fontWeight: 600, padding: "4px 6px", borderRadius: 6, fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background=T.surface2}
            onMouseLeave={e => e.currentTarget.style.background="none"}
          >+30</button>

          {/* Playback rate */}
          <button onClick={() => setPlaybackRate([1, 1.25, 1.5, 2][([1,1.25,1.5,2].indexOf(rate)+1)%4])}
            title="Playback speed"
            style={{ background: T.surface2, border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: rate !== 1 ? T.accent : T.textSecondary, fontFamily: "inherit", minWidth: 36, textAlign: "center" }}
          >{rate}×</button>

          {/* Sleep timer */}
          <button
            onClick={() => setSleep(sleepTimer ? null : 30)}
            title={sleepTimer ? `Sleep in ${sleepTimer}m (click to cancel)` : "Sleep timer (30 min)"}
            style={{ background: sleepTimer ? T.accentSurface : T.surface2, border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", fontSize: 10, fontWeight: 700, color: sleepTimer ? T.accent : T.textSecondary, fontFamily: "inherit", minWidth: 32, textAlign: "center" }}
          >
            {sleepTimer ? `${sleepTimer}m` : "ZZ"}
          </button>

          {/* Close */}
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.textTertiary, fontSize: 18, padding: "0 4px", lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color=T.danger}
            onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
          >×</button>
        </div>
      </div>
    </div>
  );
}
