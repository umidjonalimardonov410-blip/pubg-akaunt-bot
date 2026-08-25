import { defineConfig, devices } from "@playwright/test";

const CHROME = process.env.CHROMIUM_PATH ?? "/opt/ms-playwright/chromium-1194/chrome-linux/chrome";

const PORT = Number(process.env.E2E_PORT ?? 5199);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "iphone-se", use: { ...devices["iPhone SE"], browserName: "chromium", launchOptions: { executablePath: CHROME } } },
    { name: "pixel-5", use: { ...devices["Pixel 5"], browserName: "chromium", launchOptions: { executablePath: CHROME } } },
    { name: "iphone-14-pro-max", use: { ...devices["iPhone 14 Pro Max"], browserName: "chromium", launchOptions: { executablePath: CHROME } } },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
