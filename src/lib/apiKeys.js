// Active AI provider preference: 'anthropic' | 'openai'
// All API keys live server-side in the Cloudflare Worker secret store.
const LS_KEY = "fb-apikey-provider";

export function getAiProvider() {
  return localStorage.getItem(LS_KEY) || "anthropic";
}

export function setAiProvider(provider) {
  localStorage.setItem(LS_KEY, provider);
}
