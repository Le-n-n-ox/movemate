import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "layout.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30 * 60 * 1000,
  expect: { timeout: 5_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.MM_BASE_URL || "http://localhost:3000",
    reducedMotion: "reduce",
    screenshot: "off",
    trace: "off",
  },
});
