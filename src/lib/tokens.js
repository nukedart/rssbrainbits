// ── Feedbox Design Tokens ──
// Brand palette extracted from the Feedbox logo assets:
//   Dark bg:  #2F373B  (charcoal — primary brand dark)
//   Teal:     #65D5C4  (primary accent)
//   Gold:     #AA8439  (secondary accent / warm highlight)
//   White:    #F8F8F8  (light bg / card)

export const LIGHT = {
  bg:            "#F5F6F7",
  surface:       "#ECEEF0",
  surface2:      "#E0E3E6",
  border:        "#D1D5D9",
  borderStrong:  "#B8BEC4",
  text:          "#1A2124",
  textSecondary: "#4A5568",
  textTertiary:  "#8A9099",
  accent:        "#4BBFAF",       // teal — slightly deepened for contrast on white
  accentHover:   "#3AADA0",
  accentSurface: "#E8F8F6",
  accentText:    "#2A7A72",
  card:          "#FFFFFF",
  success:       "#3A9E6F",
  warning:       "#AA8439",       // brand gold as warning/highlight
  danger:        "#D94F4F",
  green:  { bg: "#E8F8F6", text: "#2A7A72" },
  amber:  { bg: "#FDF3E3", text: "#7A5E26" },
  blue:   { bg: "#E8F8F6", text: "#2A7A72" },
  purple: { bg: "#F0EEF8", text: "#5B4FA0" },
  overlay: "rgba(26,33,36,0.5)",
};

export const DARK = {
  bg:            "#1E2528",       // deeper than brand dark for true background
  surface:       "#2F373B",       // brand dark — sidebar, panels
  surface2:      "#38434A",
  border:        "#404D54",
  borderStrong:  "#536069",
  text:          "#F0F4F5",
  textSecondary: "#9BADB5",
  textTertiary:  "#5E7078",
  accent:        "#65D5C4",       // brand teal — full saturation on dark
  accentHover:   "#7ADDD0",
  accentSurface: "#1A3330",
  accentText:    "#65D5C4",
  card:          "#2F373B",       // brand dark as card
  success:       "#4BBF8F",
  warning:       "#C9A050",       // gold lightened for dark bg
  danger:        "#E06060",
  green:  { bg: "#1A3330", text: "#65D5C4" },
  amber:  { bg: "#2D2410", text: "#C9A050" },
  blue:   { bg: "#1A3330", text: "#65D5C4" },
  purple: { bg: "#1F1A30", text: "#A89FD5" },
  overlay: "rgba(0,0,0,0.65)",
};
