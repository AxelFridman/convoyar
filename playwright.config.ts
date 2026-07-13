import { defineConfig, devices } from "@playwright/test";

/**
 * E2E sobre el dev server de Vite. Mobile-first: viewport de teléfono.
 * `npm run test:e2e` (headless) · `npm run test:e2e -- --headed` para mirar.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // Puerto propio y poco común: no chocar con otros dev servers de la máquina.
    baseURL: "http://localhost:5199",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Pixel 7"]
  },
  webServer: {
    command: "npm run dev -- --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Modo local en e2e: fuerza hasSupabase=false aunque haya .env con credenciales.
    env: { VITE_E2E: "1" }
  }
});
