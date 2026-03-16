import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../hooks/useTheme";
import { getOpenAIKey, hasOpenAIKey } from "../lib/apiKeys";

// ─────────────────────────────────────────────────────────────
// OPENAI TTS ENGINE
// ─────────────────────────────────────────────────────────────
const OPENAI_VOICES = [
  { id: "nova",    label: "Nova",    desc: "Warm, natural — recommended" },
  { id: "alloy",   label: "Alloy",   desc: "Neutral, balanced" },
  { id: "echo",    label: "Echo",    desc: "Clear, precise" },
  { id: "fable",   label: "Fable",   desc: "Expressive, storytelling" },
  { id: "onyx",    label: "Onyx",    desc: "Deep, authoritative" },
  { id: "shimmer", label: "Shimmer", desc: "Soft, calm" },
  { id: "ash",     label: "Ash",     desc: "Conversational" },
  { id: "sage",    label: "Sage",    desc: "Clear, informative" },
  { id: "coral",   label: "Coral",   desc: "Friendly, upbeat" },
];

function buildWordMap(text) {
  const map = [];
  const rx = /\S+/g;
  let m;
  while ((m = rx.exec(text)) !== null) {
    map.push({ word: m[0], charStart: m.index, charEnd: m.index + m[0].length });
  }
  return map;
}

function estimateWordIdx(progress, wordMap) {
  if (!wordMap.length || progress <= 0) return 0;
  const totalChars = wordMap[wordMap.length - 1].charEnd;
  const charPos    = progress * totalChars;
  for (let i = wordMap.length - 1; i >= 0; i--) {
    if (wordMap[i].charStart <= charPos) return i;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────
// useOpenAITTS — returns state + controls + the audio blob URL
// The blob URL is the key new output: caller stores it to render
// the persistent inline player.
// ─────────────────────────────────────────────────────────────
export function useOpenAITTS({ text, voice, speed, onWord, onEnd }) {
  const [state,     setState]     = useState("idle");
  const [progress,  setProgress]  = useState(0);
  const [errorMsg,  setErrorMsg]  = useState(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null); // ← persisted blob URL

  const audioRef   = useRef(null);
  const blobUrlRef = useRef(null);
  const wordMapRef = useRef([]);
  const rafRef     = useRef(null);

  useEffect(() => { wordMapRef.current = buildWordMap(text || ""); }, [text]);

  // Cleanup only blob on text change (keep audio for inline player)
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [text]);

  function startWordSync(audio) {
    function tick() {
      if (!audio || audio.paused || audio.ended) return;
      const prog = audio.currentTime / (audio.duration || 1);
      setProgress(prog);
      const idx = estimateWordIdx(prog, wordMapRef.current);
      onWord?.(idx);
      const el = document.getElementById(`word-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  const play = useCallback(async () => {
    if (!text?.trim()) return;

    // If we already have audio blob, just replay it
    if (blobUrlRef.current && state === "paused" && audioRef.current) {
      audioRef.current.play();
      setState("playing");
      startWordSync(audioRef.current);
      return;
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      setErrorMsg("No OpenAI key. Add it in Settings.");
      setState("error");
      return;
    }

    // Cancel any existing
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    setState("loading");
    setErrorMsg(null);

    try {
      const input = text.slice(0, 3800);
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          voice,
          input,
          format: "mp3",
          speed,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
      }

      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      setAudioBlobUrl(blobUrl);  // ← expose to caller for inline player

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onplay   = () => { setState("playing"); startWordSync(audio); };
      audio.onpause  = () => { setState("paused"); cancelAnimationFrame(rafRef.current); };
      audio.onended  = () => {
        setState("idle"); setProgress(1);
        cancelAnimationFrame(rafRef.current);
        onWord?.(-1); onEnd?.();
      };
      audio.onerror = () => { setState("error"); setErrorMsg("Audio playback failed."); };

      await audio.play();
    } catch (err) {
      console.error("OpenAI TTS:", err);
      setState("error");
      setErrorMsg(err.message || "TTS failed.");
    }
  }, [text, voice, speed, state, onWord, onEnd]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    cancelAnimationFrame(rafRef.current);
    setState("paused");
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setState("idle"); setProgress(0);
    onWord?.(-1);
  }, [onWord]);

  return { state, progress, errorMsg, audioBlobUrl, play, pause, stop };
}

// ─────────────────────────────────────────────────────────────
// WEB SPEECH FALLBACK
// ─────────────────────────────────────────────────────────────
const VOICE_PRIORITY_WEB = [
  "Samantha (Premium)", "Daniel (Premium)", "Karen (Premium)",
  "Moira (Premium)",    "Tessa (Premium)",  "Fiona (Premium)",
  "Samantha (Enhanced)","Daniel (Enhanced)","Karen (Enhanced)",
  "Samantha", "Daniel", "Karen", "Moira", "Tessa",
  "Google US English",  "Google UK English Female",
];

export function rankVoices(voices) {
  const english = voices.filter((v) => v.lang.startsWith("en"));
  const ranked = [], used = new Set();
  for (const name of VOICE_PRIORITY_WEB) {
    const match = english.find((v) => v.name.includes(name) && !used.has(v.name));
    if (match) { ranked.push(match); used.add(match.name); }
  }
  english.forEach((v) => { if (!used.has(v.name)) ranked.push(v); });
  return ranked;
}

function useWebSpeechTTS({ text, voiceName, speed, onWord, onEnd }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const engine = useRef({ state: "idle", rate: speed || 1.0, voiceName: voiceName || "", charOffset: 0, utt: null });
  const [renderState, setRenderState] = useState("idle");
  const words = useRef([]);

  useEffect(() => { words.current = text ? text.match(/\S+/g) || [] : []; }, [text]);
  useEffect(() => { return () => { window.speechSynthesis?.cancel(); }; }, [text]);

  function speakFrom(charOffset = 0) {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(charOffset > 0 ? text.slice(charOffset) : text);
    utt.rate = engine.current.rate;
    utt.lang = "en-US";
    const allVoices = window.speechSynthesis.getVoices();
    const vName = engine.current.voiceName;
    let picked = vName ? allVoices.find(v => v.name === vName) : null;
    if (!picked) picked = rankVoices(allVoices)[0];
    if (picked) utt.voice = picked;

    utt.onboundary = (e) => {
      if (e.name !== "word") return;
      const abs = (charOffset || 0) + e.charIndex;
      let idx = 0, cum = 0;
      for (let i = 0; i < words.current.length; i++) {
        if (cum + words.current[i].length >= abs) { idx = i; break; }
        cum += words.current[i].length + 1;
      }
      engine.current.charOffset = abs;
      onWord?.(idx);
      const el = document.getElementById(`word-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    utt.onstart  = () => { engine.current.state = "playing"; setRenderState("playing"); };
    utt.onpause  = () => { engine.current.state = "paused";  setRenderState("paused"); };
    utt.onresume = () => { engine.current.state = "playing"; setRenderState("playing"); };
    utt.onend    = () => { engine.current.state = "idle"; engine.current.charOffset = 0; setRenderState("idle"); onWord?.(-1); onEnd?.(); };
    utt.onerror  = (e) => { if (e.error !== "interrupted") { engine.current.state = "idle"; setRenderState("idle"); } };
    engine.current.utt = utt; engine.current.state = "playing"; setRenderState("playing");
    window.speechSynthesis.speak(utt);
  }

  const play = useCallback(() => {
    if (engine.current.state === "paused") { window.speechSynthesis.resume(); return; }
    engine.current.charOffset = 0; speakFrom(0);
  }, [text]);
  const pause       = useCallback(() => { window.speechSynthesis.pause(); }, []);
  const stop        = useCallback(() => { window.speechSynthesis.cancel(); engine.current.state = "idle"; engine.current.charOffset = 0; setRenderState("idle"); onWord?.(-1); }, []);
  const changeVoice = useCallback((n) => {
    engine.current.voiceName = n; localStorage.setItem("fb-voice-web", n);
    if (engine.current.state === "playing" || engine.current.state === "paused") speakFrom(engine.current.charOffset);
  }, []);
  const changeRate  = useCallback((r) => {
    engine.current.rate = r;
    if (engine.current.state === "playing") speakFrom(engine.current.charOffset);
  }, []);

  return { state: renderState, audioBlobUrl: null, play, pause, stop, changeVoice, changeRate };
}

// ─────────────────────────────────────────────────────────────
// VoicePicker dropdown
// ─────────────────────────────────────────────────────────────
export function VoicePicker({ mode, selectedVoice, onChange }) {
  const { T }   = useTheme();
  const [open, setOpen]       = useState(false);
  const [webVoices, setWebVoices] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (mode !== "webspeech") return;
    function load() { setWebVoices(rankVoices(window.speechSynthesis?.getVoices() || [])); }
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const voices  = mode === "openai" ? OPENAI_VOICES : webVoices;
  const current = mode === "openai"
    ? OPENAI_VOICES.find(v => v.id === selectedVoice) || OPENAI_VOICES[0]
    : webVoices.find(v => v.name === selectedVoice) || webVoices[0];

  if (!voices.length) return null;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: "flex", alignItems: "center", gap: 6,
        background: open ? T.accentSurface : T.surface2,
        border: `1px solid ${open ? T.accent : T.border}`,
        borderRadius: 8, padding: "5px 10px 5px 8px",
        cursor: "pointer", fontFamily: "inherit", maxWidth: 160, transition: "all .12s",
      }}>
        <span style={{ fontSize: 14 }}>🎙</span>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mode === "openai"
              ? (current?.label || "Nova")
              : (current?.name?.replace(" (Premium)","★").replace(" (Enhanced)","↑") || "Voice")}
          </div>
          <div style={{ fontSize: 10, color: mode === "openai" ? T.accentText : T.textTertiary, fontWeight: 600 }}>
            {mode === "openai" ? "OpenAI HD" : "Device"}
          </div>
        </div>
        <span style={{ fontSize: 9, color: T.textTertiary }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 72, right: 16, width: 290,
          background: T.card, border: `1px solid ${T.borderStrong}`,
          borderRadius: 14,
          boxShadow: "0 -8px 40px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.1)",
          zIndex: 2000, overflow: "hidden", animation: "slideUp .15s ease",
        }}>
          <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              {mode === "openai" ? "OpenAI Voices" : "Device Voices"}
            </div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>
              {mode === "openai" ? "All tts-1-hd quality. Nova is recommended." : "Premium = Siri voices (best quality)."}
            </div>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {(mode === "openai" ? OPENAI_VOICES : webVoices).map((v) => {
              const id    = mode === "openai" ? v.id : v.name;
              const label = mode === "openai" ? v.label : v.name.replace(" (Premium)","").replace(" (Enhanced)","");
              const sub   = mode === "openai" ? v.desc : v.lang;
              const isSel = (selectedVoice || (mode === "openai" ? "nova" : webVoices[0]?.name)) === id;
              const isP   = mode === "webspeech" && v.name?.includes("Premium");
              const isE   = mode === "webspeech" && v.name?.includes("Enhanced");
              return (
                <div key={id} onClick={() => { onChange(id); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${T.border}`, background: isSel ? T.accentSurface : "transparent", transition: "background .08s" }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.surface; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isSel ? 700 : 400, color: isSel ? T.accentText : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
                    <div style={{ fontSize: 11, color: T.textTertiary }}>{sub}</div>
                  </div>
                  {(isP || isE) && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: isP ? "#F5F3FF" : "#EBF1FD", color: isP ? "#5B21B6" : "#1A4FB8", flexShrink: 0 }}>
                      {isP ? "Premium" : "Enhanced"}
                    </span>
                  )}
                  {isSel && <span style={{ color: T.accent, fontSize: 16 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// InlineAudioPlayer — persistent HTML5 player shown at top of article
// Appears once audio has been generated and stays even if floating
// TTSPlayer is dismissed.
// ─────────────────────────────────────────────────────────────
export function InlineAudioPlayer({ blobUrl, voiceLabel }) {
  const { T }    = useTheme();
  const audioRef = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const rafRef   = useRef(null);

  useEffect(() => {
    if (!blobUrl) return;
    const audio = new Audio(blobUrl);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.onended = () => { setPlaying(false); setProgress(0); };
    return () => { audio.pause(); cancelAnimationFrame(rafRef.current); };
  }, [blobUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
      function tick() {
        setProgress(audio.currentTime / (audio.duration || 1));
        if (!audio.paused) rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  function handleScrub(e) {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  }

  function fmt(s) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  if (!blobUrl) return null;

  return (
    <div style={{
      background: T.accentSurface,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: "10px 14px",
      marginBottom: 20,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      {/* Play/Pause */}
      <button onClick={togglePlay} style={{
        width: 32, height: 32, borderRadius: "50%",
        background: T.accent, border: "none", color: "#fff",
        fontSize: 14, cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 6px rgba(47,111,237,.3)",
      }}>{playing ? "⏸" : "▶"}</button>

      {/* Scrubber */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.accentText }}>
            🎙 {voiceLabel || "AI Audio"} · OpenAI tts-1-hd
          </span>
          <span style={{ fontSize: 11, color: T.textTertiary }}>
            {fmt(progress * duration)} / {fmt(duration)}
          </span>
        </div>
        {/* Progress bar — clickable */}
        <div
          onClick={handleScrub}
          style={{
            height: 4, background: T.surface2, borderRadius: 2, cursor: "pointer",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: T.accent, borderRadius: 2, transition: "width .1s linear",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating TTSPlayer bar
// ─────────────────────────────────────────────────────────────
const SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export default function TTSPlayer({ text, onClose, wordCount, label = "Listen to article", onAudioReady }) {
  const { T }  = useTheme();
  const mode   = hasOpenAIKey() ? "openai" : "webspeech";

  const [openaiVoice, setOpenaiVoice] = useState(() => localStorage.getItem("fb-oai-voice") || "nova");
  const [webVoice,    setWebVoice]    = useState(() => localStorage.getItem("fb-voice-web") || "");
  const [speed,       setSpeed]       = useState(() => parseFloat(localStorage.getItem("fb-tts-speed") || "1"));
  const [activeWord,  setActiveWord]  = useState(-1);

  function handleWord(idx) {
    setActiveWord(idx);
    window.dispatchEvent(new CustomEvent("tts-word", { detail: { index: idx } }));
  }

  const oai = useOpenAITTS({
    text:  mode === "openai" ? text : "",
    voice: openaiVoice, speed,
    onWord: handleWord,
    onEnd:  () => setActiveWord(-1),
  });

  const ws = useWebSpeechTTS({
    text:      mode === "webspeech" ? text : "",
    voiceName: webVoice, speed,
    onWord:    handleWord,
    onEnd:     () => setActiveWord(-1),
  });

  const engine    = mode === "openai" ? oai : ws;
  const isPlaying = engine.state === "playing";
  const isLoading = engine.state === "loading";
  const progress  = mode === "openai"
    ? (oai.progress || 0)
    : (wordCount > 0 && activeWord >= 0 ? activeWord / wordCount : 0);

  // Notify parent when audio blob is ready (for InlineAudioPlayer)
  useEffect(() => {
    if (oai.audioBlobUrl) onAudioReady?.(oai.audioBlobUrl, openaiVoice);
  }, [oai.audioBlobUrl]);

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next); localStorage.setItem("fb-tts-speed", String(next));
    if (mode === "webspeech") ws.changeRate?.(next);
  }

  function handleVoiceChange(name) {
    if (mode === "openai") {
      setOpenaiVoice(name); localStorage.setItem("fb-oai-voice", name);
      if (engine.state === "playing" || engine.state === "paused") { oai.stop(); setTimeout(() => oai.play(), 100); }
    } else {
      setWebVoice(name); ws.changeVoice?.(name);
    }
  }

  function handleClose() { engine.stop(); onClose(); }

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 800, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderTop: `1px solid ${T.borderStrong}`,
        borderRadius: "16px 16px 0 0", boxShadow: "0 -4px 28px rgba(0,0,0,.16)",
        width: "100%", maxWidth: 760, pointerEvents: "all",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: T.surface2, borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
          <div style={{ height: "100%", background: T.accent, width: `${Math.round(progress * 100)}%`, transition: "width .25s linear" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px" }}>
          <button onClick={isPlaying ? engine.pause : engine.play} disabled={isLoading}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: isLoading ? T.surface2 : T.accent,
              border: "none", color: isLoading ? T.textSecondary : "#fff",
              fontSize: 16, cursor: isLoading ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, boxShadow: isLoading ? "none" : "0 2px 8px rgba(47,111,237,.35)",
              transition: "all .15s",
            }}
            onMouseDown={e => { if (!isLoading) e.currentTarget.style.transform = "scale(0.92)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {isLoading ? "…" : isPlaying ? "⏸" : "▶"}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isLoading ? "Generating audio…" : label}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: mode === "openai" ? T.accentSurface : T.surface2, color: mode === "openai" ? T.accentText : T.textTertiary, flexShrink: 0 }}>
                {mode === "openai" ? "OpenAI" : "Device"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.textTertiary }}>
              {(isPlaying || engine.state === "paused") && activeWord >= 0
                ? `Word ${activeWord + 1} of ${wordCount}`
                : engine.state === "error" && oai?.errorMsg
                  ? <span style={{ color: T.danger }}>{oai.errorMsg}</span>
                  : `${wordCount} words`}
            </div>
          </div>

          <VoicePicker mode={mode} selectedVoice={mode === "openai" ? openaiVoice : webVoice} onChange={handleVoiceChange} />

          <button onClick={cycleSpeed} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: T.text, fontFamily: "inherit", flexShrink: 0 }}>{speed}×</button>

          <button onClick={handleClose} style={{ background: T.surface2, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: T.textSecondary, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      </div>
    </div>
  );
}
