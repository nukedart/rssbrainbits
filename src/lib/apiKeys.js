// ── Runtime API key management ────────────────────────────────
// Vite env vars are baked in at build time. To let users set
// keys via the Settings UI without rebuilding, we check
// localStorage first, then fall back to the build-time value.

const LS_PREFIX = "fb-apikey-";

export function getAnthropicKey() {
  return localStorage.getItem(LS_PREFIX + "anthropic") ||
         import.meta.env.VITE_ANTHROPIC_API_KEY || "";
}

export function setAnthropicKey(key) {
  if (key?.trim()) {
    localStorage.setItem(LS_PREFIX + "anthropic", key.trim());
  } else {
    localStorage.removeItem(LS_PREFIX + "anthropic");
  }
}
