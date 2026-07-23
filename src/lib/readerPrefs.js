// ── Reader preferences — font size, line width, font family, bionic mode ──
// All stored in localStorage, applied via CSS custom properties on <body>.

const DEFAULTS = {
  fontSize:  20,          // px  — range 14–24
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
    p.lineWidth === "narrow" ? "60ch" : p.lineWidth === "wide" ? "85ch" : "70ch"
  );
  root.style.setProperty("--reader-font-family",
    p.fontFamily === "sans"
      ? "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
      : "ui-serif, Georgia, 'Times New Roman', serif"
  );
}

// Call once on app boot
export function initReaderPrefs() {
  applyReaderPrefs(getReaderPrefs());
}

// Note: BionicWord React component lives in ContentViewer.jsx (JSX file)
