import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path logic:
// - Custom domain (rss.brainbits.us): base = "/"
// - GitHub Pages subfolder (nukedart.github.io/rssbrainbits): base = "/rssbrainbits/"
// The deploy workflow passes --base=... at build time via VITE_BASE_PATH.
// Locally, base = "/" always.
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  plugins: [react()],
  base,
  build: { outDir: "dist" },
});
