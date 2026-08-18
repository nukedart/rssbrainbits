import { useCallback, useEffect, useRef, useState } from "react";

const SUPPORTED = typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";

// Chrome drops utterances longer than ~15s, so the article is spoken as a queue
// of sentence-sized chunks. Slices are contiguous, so a chunk's `offset` plus a
// boundary event's charIndex is an exact character index into the full text.
function chunkText(text, max = 220) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + max, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const brk = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "), slice.lastIndexOf("\n"));
      if (brk > max * 0.4) end = start + brk + 1;
    }
    if (text.slice(start, end).trim()) chunks.push({ text: text.slice(start, end), offset: start });
    start = end;
  }
  return chunks;
}

export function useReadAloud(text, resetKey) {
  const [status, setStatus] = useState("idle"); // idle | speaking | paused
  const [charIndex, setCharIndex] = useState(-1);
  const genRef = useRef(0);
  const chunksRef = useRef([]);

  const stop = useCallback(() => {
    genRef.current += 1;
    if (SUPPORTED) window.speechSynthesis.cancel();
    setStatus("idle");
    setCharIndex(-1);
  }, []);

  useEffect(() => stop, [stop]);
  useEffect(() => { stop(); }, [resetKey, stop]);

  function speakChunk(i) {
    const chunk = chunksRef.current[i];
    if (!chunk) { setStatus("idle"); setCharIndex(-1); return; }
    const gen = genRef.current;
    const u = new window.SpeechSynthesisUtterance(chunk.text);
    u.onboundary = e => {
      if (gen !== genRef.current || (e.name && e.name !== "word")) return;
      setCharIndex(chunk.offset + e.charIndex);
    };
    u.onend = () => { if (gen === genRef.current) speakChunk(i + 1); };
    u.onerror = () => { if (gen === genRef.current) { setStatus("idle"); setCharIndex(-1); } };
    window.speechSynthesis.speak(u);
  }

  function play() {
    if (!SUPPORTED || !text) return;
    if (status === "paused") { window.speechSynthesis.resume(); setStatus("speaking"); return; }
    genRef.current += 1;
    window.speechSynthesis.cancel();
    chunksRef.current = chunkText(text);
    setCharIndex(-1);
    setStatus("speaking");
    speakChunk(0);
  }

  function pause() {
    if (!SUPPORTED || status !== "speaking") return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }

  return { supported: SUPPORTED, status, charIndex, play, pause, stop };
}
