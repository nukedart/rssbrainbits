import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ─────────────────────────────────────────────────────────────
// base: "/" because we're using a custom domain (rss.brainbits.us)
// Custom domains always serve from root — never use a subfolder base.
// ─────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: { outDir: "dist" },
});
