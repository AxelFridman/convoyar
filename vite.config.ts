/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build`        → dist/           (deploy web / PWA / Capacitor)
// `npm run build:single` → dist-single/    (un solo index.html autocontenido, ideal para demo)
export default defineConfig(({ mode }) => ({
  plugins: mode === "single" ? [react(), viteSingleFile()] : [react()],
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    chunkSizeWarningLimit: 1500
  },
  test: {
    // los e2e/*.spec.ts son de Playwright, no de vitest
    include: ["src/**/*.test.{ts,tsx}"]
  }
}));
