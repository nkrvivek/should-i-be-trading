import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load .env.test for test credentials
config({ path: ".env.test" });

/**
 * E2E test configuration for SIBT.
 *
 * Requires environment variables:
 *   TEST_USER_EMAIL    — Supabase test account email
 *   TEST_USER_PASSWORD — Supabase test account password
 *   TEST_BASE_URL      — App URL (default: http://localhost:5173)
 *
 * Create a .env.test file (gitignored) with these values,
 * or export them before running tests.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run sequentially — auth state is shared
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Public pages — no auth required, can run independently
    {
      name: "public",
      testMatch: /public-pages\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: { cookies: [], origins: [] } },
    },
    // Auth setup — runs first, saves session to e2e/.auth/user.json
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      use: { storageState: undefined }, // No stored state for login
    },
    // Auth flow tests — no stored state (tests login/logout)
    {
      name: "auth",
      testMatch: /auth-flows\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: { cookies: [], origins: [] } },
      dependencies: ["setup"], // still need setup to run first for other projects
    },
    // Main tests — reuse saved auth session
    {
      name: "chromium",
      testIgnore: [/public-pages\.spec\.ts/, /auth-flows\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],

  // Start dev server automatically if not already running
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
