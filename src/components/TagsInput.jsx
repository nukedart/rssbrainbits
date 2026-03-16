import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";

export default function TagsInput({ tags, onAdd, onRemove, allTags = [] }) {
  const { T } = useTheme();
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const suggestions = allTags
    .filter((t) => t.toLowerCase().startsWith(input.toLowerCase()) && !tags.includes(t))
    .slice(0, 5);

  function submit(tag) {
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!clean || tags.includes(clean)) return;
    onAdd(clean);
    setInput("");
    setShowSuggestions(false);
  }

  function handleKeyDown(e) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      submit(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px",
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 10, cursor: "text", minHeight: 42, alignItems: "center",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 20,
            background: T.accentSurface, color: T.accentText,
            fontSize: 12, fontWeight: 600,
          }}>
            #{tag}
            <button onClick={(e) => { e.stopPropagation(); onRemove(tag); }} style={{
              background: "none", border: "none", cursor: "pointer",
              color: T.accentText, fontSize: 14, padding: 0, lineHeight: 1, opacity: 0.6,
            }}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? "Add tags… (press Enter)" : ""}
          style={{
            border: "none", background: "none", outline: "none",
            fontSize: 13, color: T.text, fontFamily: "inherit", minWidth: 80, flex: 1,
          }}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.1)", zIndex: 100, overflow: "hidden",
        }}>
          {suggestions.map((s) => (
            <div key={s} onClick={() => submit(s)} style={{
              padding: "9px 14px", fontSize: 13, color: T.text, cursor: "pointer",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >#{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}
