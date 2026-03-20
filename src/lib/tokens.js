// ── Feedbox Design Tokens — Editorial Nocturne ──
// Design system: "The Midnight Editor"
// Primary voice: Noto Serif (editorial), Inter (functional labels)
// Accent: sage-emerald (#accfae) — used sparingly as a guide, not a coating
// Surface hierarchy: #121416 → #1a1c1e → #1e2022 → #2e3132

export const DARK = {
  // ── Surface Hierarchy (tonal depth — no hard borders) ──
  bg:            "#121416",       // surface: primary canvas (deepest layer)
  surface:       "#1a1c1e",       // surface-container-low: sidebars, feed bg
  surface2:      "#2e3132",       // surface-container-highest: floating, active states

  // ── Ghost Borders (outline-variant at low opacity — "suggestion of a boundary") ──
  border:        "rgba(66,72,65,0.2)",   // outline-variant at 20% — ghost border fallback
  borderStrong:  "#424841",              // outline-variant — only for inputs/secondary buttons

  // ── Text ──
  text:          "#f1f1f1",       // on-surface: primary text
  textSecondary: "#c2c8bf",       // on-surface-variant: recedes without losing readability
  textTertiary:  "#737971",       // outline: placeholder, meta, timestamps

  // ── Accent: sage-emerald (sparingly — guides the eye, doesn't overwhelm) ──
  accent:        "#accfae",       // primary
  accentHover:   "#acd0ad",       // primary-fixed-dim
  accentSurface: "rgba(172,207,174,0.07)", // very subtle tint for hover/active backgrounds
  accentText:    "#03210b",       // on-primary: text on filled accent elements

  // ── Cards & Containers ──
  card:          "#1e2022",       // surface-container: actionable cards, draws the eye

  // ── Semantic ──
  success:       "#accfae",
  warning:       "#c9a050",
  danger:        "#ba1a1a",

  // ── Color-coded families (smart feeds, folders, highlights) ──
  green:  { bg: "rgba(172,207,174,0.08)", text: "#accfae" },
  amber:  { bg: "#2d2410",               text: "#c9a050" },
  blue:   { bg: "#1a2033",               text: "#9badb5" },
  purple: { bg: "#1f1a30",               text: "#a89fd5" },

  // ── Overlay ──
  overlay: "rgba(0,0,0,0.65)",
};

export const LIGHT = {
  // ── Surface Hierarchy ──
  bg:            "#f4f2ee",       // warm parchment
  surface:       "#eceae4",       // slightly deeper panel
  surface2:      "#dedad0",       // highest elevation on light

  // ── Ghost Borders ──
  border:        "rgba(90,85,75,0.12)",
  borderStrong:  "#b8b3a8",

  // ── Text ──
  text:          "#1a1c1e",
  textSecondary: "#5a5750",
  textTertiary:  "#8a857c",

  // ── Accent: primary-container for legibility on light ──
  accent:        "#4f6f52",
  accentHover:   "#3d5940",
  accentSurface: "#e8f0e8",
  accentText:    "#ffffff",

  // ── Cards ──
  card:          "#ffffff",

  // ── Semantic ──
  success:       "#4f6f52",
  warning:       "#aa8439",
  danger:        "#ba1a1a",

  // ── Color-coded families ──
  green:  { bg: "#e8f0e8", text: "#4f6f52" },
  amber:  { bg: "#fdf3e3", text: "#7a5e26" },
  blue:   { bg: "#e8eef8", text: "#3a5a8a" },
  purple: { bg: "#f0eef8", text: "#5b4fa0" },

  // ── Overlay ──
  overlay: "rgba(26,28,30,0.5)",
};
