// ── Reader preferences — font size, line width, font family, bionic mode ──
// All stored in localStorage, applied via CSS custom properties on <body>.

const DEFAULTS = {
  fontSize:  19,          // px  — range 14–22
  lineWidth: "medium",    // "narrow" | "medium" | "wide"
  fontFamily:"serif",     // "sans" | "serif" — default to editorial serif
  bionic:    false,       // bionic reading mode
};

const LS_KEY = "fb-reader-prefs";

export function getReaderPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setReaderPrefs(prefs) {
  const merged = { ...getReaderPrefs(), ...prefs };
  localStorage.setItem(LS_KEY, JSON.stringify(merged));
  applyReaderPrefs(merged);
  return merged;
}

export function applyReaderPrefs(prefs) {
  const p = prefs || getReaderPrefs();
  const root = document.documentElement;
  root.style.setProperty("--reader-font-size",   p.fontSize + "px");
  root.style.setProperty("--reader-line-width",
    p.lineWidth === "narrow" ? "520px" : p.lineWidth === "wide" ? "780px" : "660px"
  );
  root.style.setProperty("--reader-font-family",
    p.fontFamily === "sans"
      ? "'Poppins', system-ui, sans-serif"
      : "'Merriweather', Georgia, serif"
  );
}

// Call once on app boot
export function initReaderPrefs() {
  applyReaderPrefs(getReaderPrefs());
}

// ── Bionic reading text transform ────────────────────────────
// Bolds the first ~40-50% of each word to guide the eye.
export function applyBionicToText(text) {
  if (!text) return text;
  return text.replace(/\b([a-zA-Z]+)\b/g, (word) => {
    const bold = Math.ceil(word.length * 0.45);
    return `**${word.slice(0, bold)}**${word.slice(bold)}`;
  });
}

// Note: BionicWord React component lives in ContentViewer.jsx (JSX file)
