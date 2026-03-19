// ── Runtime API key management ────────────────────────────────
// Keys are stored in localStorage only (set via Settings UI).
// Never use VITE_ env vars for API keys — Vite bakes them into
// the JS bundle, exposing them to anyone who views source.
// Server-side summarization uses the Cloudflare Worker secret instead.

const LS_PREFIX = "fb-apikey-";

export function getAnthropicKey() {
  return localStorage.getItem(LS_PREFIX + "anthropic") || "";
}

export function setAnthropicKey(key) {
  if (key?.trim()) {
    localStorage.setItem(LS_PREFIX + "anthropic", key.trim());
  } else {
    localStorage.removeItem(LS_PREFIX + "anthropic");
  }
}
