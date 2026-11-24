import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PREVIEW_URL ?? "http://127.0.0.1:3000",
    browserName: "chromium",
    headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" },
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
