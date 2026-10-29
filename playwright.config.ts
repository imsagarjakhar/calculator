import { defineConfig, devices } from "@playwright/test";

// npm run test:e2e assigns a free PREVIEW_PORT in CI and passes it to all workers.
const previewPort = Number(process.env.PREVIEW_PORT || "4173");
const previewOrigin = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: previewOrigin,
    channel: "chromium",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: previewOrigin + (process.env.VITE_BASE_PATH || "/"),
    reuseExistingServer: !process.env.CI,
  },
});
