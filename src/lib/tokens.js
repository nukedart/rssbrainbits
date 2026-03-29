// ── Feedbox Design Tokens ──
// Three themes: NOCTURNE (sage dark), DISTILLED (blue dark), LIGHT (parchment)

// ── Theme 1: Editorial Nocturne ─────────────────────────────
// "The Midnight Editor" — Noto Serif + Inter, sage-emerald on deep slate
export const NOCTURNE = {
  bg:            "#121416",
  surface:       "#1a1c1e",
  surface2:      "#2e3132",
  border:        "rgba(66,72,65,0.2)",
  borderStrong:  "#424841",
  text:          "#f1f1f1",
  textSecondary: "#c2c8bf",
  textTertiary:  "#737971",
  accent:        "#accfae",
  accentHover:   "#acd0ad",
  accentSurface: "rgba(172,207,174,0.07)",
  accentText:    "#03210b",
  card:          "#1e2022",
  success:       "#accfae",
  warning:       "#c9a050",
  danger:        "#ba1a1a",
  dangerText:    "#ffffff",
  green:  { bg: "rgba(172,207,174,0.08)", text: "#accfae" },
  amber:  { bg: "#2d2410",               text: "#c9a050" },
  blue:   { bg: "#1a2033",               text: "#9badb5" },
  purple: { bg: "#1f1a30",               text: "#a89fd5" },
  overlay: "rgba(0,0,0,0.65)",
  readerFont: "'Merriweather', Georgia, serif",
};

// ── Theme 2: The Distilled Workspace ────────────────────────
// "The Distilled Workspace" — Newsreader + Inter, periwinkle-blue on near-black
export const DISTILLED = {
  bg:            "#131315",
  surface:       "#1f1f21",
  surface2:      "#353437",
  border:        "rgba(65,71,84,0.15)",
  borderStrong:  "#414754",
  text:          "#e4e2e4",
  textSecondary: "#c0c6d6",
  textTertiary:  "#8b91a0",
  accent:        "#aac7ff",
  accentHover:   "#c5d8ff",
  accentSurface: "rgba(170,199,255,0.07)",
  accentText:    "#003064",
  card:          "#1f1f21",
  success:       "#6dd58c",
  warning:       "#e8b04b",
  danger:        "#ffb4ab",
  dangerText:    "#690005",
  green:  { bg: "rgba(109,213,140,0.08)", text: "#6dd58c" },
  amber:  { bg: "rgba(232,176,75,0.08)",  text: "#e8b04b" },
  blue:   { bg: "rgba(170,199,255,0.08)", text: "#aac7ff" },
  purple: { bg: "rgba(210,179,255,0.08)", text: "#d2b3ff" },
  overlay: "rgba(0,0,0,0.7)",
  readerFont: "'Merriweather', Georgia, serif",
};

// ── Theme 3: Light (Parchment Editorial) ────────────────────
export const LIGHT = {
  bg:            "#f4f2ee",
  surface:       "#eceae4",
  surface2:      "#dedad0",
  border:        "rgba(90,85,75,0.12)",
  borderStrong:  "#b8b3a8",
  text:          "#1a1c1e",
  textSecondary: "#5a5750",
  textTertiary:  "#8a857c",
  accent:        "#4f6f52",
  accentHover:   "#3d5940",
  accentSurface: "#e8f0e8",
  accentText:    "#ffffff",
  card:          "#ffffff",
  success:       "#4f6f52",
  warning:       "#aa8439",
  danger:        "#ba1a1a",
  dangerText:    "#ffffff",
  green:  { bg: "#e8f0e8", text: "#4f6f52" },
  amber:  { bg: "#fdf3e3", text: "#7a5e26" },
  blue:   { bg: "#e8eef8", text: "#3a5a8a" },
  purple: { bg: "#f0eef8", text: "#5b4fa0" },
  overlay: "rgba(26,28,30,0.5)",
  readerFont: "'Merriweather', Georgia, serif",
};

// backwards-compat alias
export const DARK = NOCTURNE;
