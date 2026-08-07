// ── Feedbox Design Tokens ──
// Six themes: NOCTURNE, DISTILLED, LIGHT, CREAM, INK, SEPIA

// ── Brand (fixed, theme-independent) ────────────────────────
// The Feedbox mark's own colors — used for the logo/favicon/app-icon glyph
// and other brand-identity moments. Not a theme accent; themes keep their
// own muted, editorial palettes (see below).
export const BRAND = {
  mint:     "#65D5C4",
  mintDeep: "#47AD9E",
  ink:      "#2F373B",
};

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
  readerFont: "ui-serif, Georgia, 'Times New Roman', serif",
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
  readerFont: "ui-serif, Georgia, 'Times New Roman', serif",
};

// ── Theme 3: Light (Parchment Editorial) ────────────────────
export const LIGHT = {
  bg:            "#ffffff",
  surface:       "#F2F2F7",
  surface2:      "#E5E5EA",
  border:        "rgba(0,0,0,0.08)",
  borderStrong:  "#C7C7CC",
  text:          "#1a1c1e",
  textSecondary: "#5a5750",
  textTertiary:  "#8a857c",
  accent:        "#4f6f52",
  accentHover:   "#3d5940",
  accentSurface: "rgba(79,111,82,0.07)",
  accentText:    "#ffffff",
  card:          "#FAFAFA",
  success:       "#4f6f52",
  warning:       "#aa8439",
  danger:        "#ba1a1a",
  dangerText:    "#ffffff",
  green:  { bg: "#e8f0e8", text: "#4f6f52" },
  amber:  { bg: "#fdf3e3", text: "#7a5e26" },
  blue:   { bg: "#e8eef8", text: "#3a5a8a" },
  purple: { bg: "#f0eef8", text: "#5b4fa0" },
  overlay: "rgba(26,28,30,0.5)",
  readerFont: "ui-serif, Georgia, 'Times New Roman', serif",
};

// ── Theme 4: Cream (editorial light — cream/charcoal/sage) ──
// Inspired by the design handoff: cream bg, hairline borders, sage accent
export const CREAM = {
  bg:            "#F5F1EA",
  surface:       "#EFE8DC",
  surface2:      "#E8DFCF",
  border:        "rgba(42,37,32,0.08)",
  borderStrong:  "rgba(42,37,32,0.25)",
  text:          "#2A2520",
  textSecondary: "#3A332C",
  textTertiary:  "#6B5A4C",
  accent:        "#7A8770",
  accentHover:   "#5A6651",
  accentSurface: "rgba(122,135,112,0.18)",
  accentText:    "#FAF6EE",
  card:          "#FAF6EE",
  success:       "#7A8770",
  warning:       "#9A6B3F",
  danger:        "#B85C4A",
  dangerText:    "#FAF6EE",
  green:  { bg: "rgba(122,135,112,0.12)", text: "#5A6651" },
  amber:  { bg: "rgba(154,107,63,0.10)",  text: "#9A6B3F" },
  blue:   { bg: "rgba(90,102,81,0.10)",   text: "#5A6651" },
  purple: { bg: "rgba(90,80,120,0.08)",   text: "#6A5A9A" },
  overlay: "rgba(42,37,32,0.4)",
  readerFont: "'Cormorant Garamond', Georgia, ui-serif, serif",
};

// ── Theme 5: Ink (editorial dark — warm charcoal) ────────────
export const INK = {
  bg:            "#1B1814",
  surface:       "#181511",
  surface2:      "#211D18",
  border:        "rgba(245,241,234,0.08)",
  borderStrong:  "rgba(245,241,234,0.14)",
  text:          "#EFE8DC",
  textSecondary: "#D9D0BE",
  textTertiary:  "#A39885",
  accent:        "#8E9C82",
  accentHover:   "#A6B49A",
  accentSurface: "rgba(142,156,130,0.18)",
  accentText:    "#1B1814",
  card:          "#211D18",
  success:       "#8E9C82",
  warning:       "#C9A050",
  danger:        "#B85C4A",
  dangerText:    "#EFE8DC",
  green:  { bg: "rgba(142,156,130,0.10)", text: "#A6B49A" },
  amber:  { bg: "rgba(200,160,80,0.10)",  text: "#C9A050" },
  blue:   { bg: "rgba(100,120,160,0.10)", text: "#9BADB5" },
  purple: { bg: "rgba(160,140,200,0.08)", text: "#A89FD5" },
  overlay: "rgba(0,0,0,0.6)",
  readerFont: "'Cormorant Garamond', Georgia, ui-serif, serif",
};

// ── Theme 6: Sepia ───────────────────────────────────────────
export const SEPIA = {
  bg:            "#ECE0CB",
  surface:       "#E5D6BB",
  surface2:      "#D8C9A8",
  border:        "rgba(61,46,31,0.10)",
  borderStrong:  "rgba(61,46,31,0.18)",
  text:          "#3D2E1F",
  textSecondary: "#4F3D2A",
  textTertiary:  "#786040",
  accent:        "#9A6B3F",
  accentHover:   "#74502D",
  accentSurface: "rgba(154,107,63,0.16)",
  accentText:    "#FAF6EE",
  card:          "#F1E7D4",
  success:       "#9A6B3F",
  warning:       "#74502D",
  danger:        "#B85C4A",
  dangerText:    "#FAF6EE",
  green:  { bg: "rgba(154,107,63,0.12)", text: "#74502D" },
  amber:  { bg: "rgba(180,120,50,0.10)", text: "#9A6B3F" },
  blue:   { bg: "rgba(80,90,120,0.08)",  text: "#4A5A8A" },
  purple: { bg: "rgba(100,80,130,0.08)", text: "#6A5A9A" },
  overlay: "rgba(61,46,31,0.4)",
  readerFont: "'Cormorant Garamond', Georgia, ui-serif, serif",
};

// ── Shared shape & spacing scale (Reeder-style) ──────────────
// Consumed by components for consistent radii/spacing across themes.
export const SHAPE = {
  radiusXs:   6,    // favicons, small chips
  radiusSm:   10,   // buttons, inputs
  radiusMd:   14,   // thumbnails, menus
  radiusCard: 16,   // list cards, panels
  radiusPill: 999,  // floating bars, pills, dots
  rowPadY:    14,   // list row vertical padding
  rowPadX:    16,   // list row horizontal padding
  rowGap:     12,   // gap between row text block and thumbnail
  barInset:   14,   // floating bottom bar inset from screen edges
  blur:       "saturate(160%) blur(14px)", // backdrop-filter for floating chrome (14px ≈ same look, cheaper on GPU than 20px)
  shadowFloat: "0 8px 28px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.10)",
  shadowFloatUp:   "0 -8px 28px rgba(0,0,0,0.18), 0 -1px 2px rgba(0,0,0,0.10)",   // bottom sheets
  shadowFloatLeft: "-8px 0 28px rgba(0,0,0,0.18), -1px 0 2px rgba(0,0,0,0.10)",   // right-side drawers
};

// backwards-compat alias
export const DARK = NOCTURNE;

export const FOLDER_COLORS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
