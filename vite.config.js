import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

// Base path logic:
// - Custom domain (rss.brainbits.us): base = "/"
// - GitHub Pages subfolder (nukedart.github.io/rssbrainbits): base = "/rssbrainbits/"
// The deploy workflow passes --base=... at build time via VITE_BASE_PATH.
// Locally, base = "/" always.
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  plugins: [react()],
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main:  resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin/index.html"),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) return "vendor-react";
          if (id.includes("node_modules/@supabase"))  return "vendor-supabase";
          if (id.includes("node_modules/fuse.js"))    return "vendor-fuse";
        },
      },
    },
  },
});
