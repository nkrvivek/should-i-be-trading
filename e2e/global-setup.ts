import { test as setup, expect } from "@playwright/test";

/**
 * Global setup: Log in once and save auth state for all tests.
 *
 * This runs before all test files. It:
 * 1. Navigates to /login
 * 2. Signs in with test credentials from env vars
 * 3. Waits for redirect to dashboard (confirms auth)
 * 4. Saves browser storage (cookies + localStorage) to e2e/.auth/user.json
 *
 * All subsequent tests reuse this saved state — no login needed per test.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing TEST_USER_EMAIL or TEST_USER_PASSWORD env vars.\n" +
      "Create a .env.test file or export them before running tests.\n" +
      "The test user should be a starter/pro tier account in your Supabase project."
    );
  }

  // Navigate to login
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill credentials — try common Supabase Auth UI selectors
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await expect(emailInput).toBeVisible({ timeout: 10_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Submit
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("SIGN IN")').first();
  await submitBtn.click();

  // Wait for authenticated redirect — should land on dashboard or similar
  await page.waitForURL((url) => {
    const path = url.pathname;
    return path === "/" || path === "/dashboard" || path === "/regime" || path === "/app";
  }, { timeout: 15_000 });

  // Verify we're logged in — nav should show user-specific elements
  // Settings button (has title="Settings" or user's display name) or absence of SIGN IN
  await expect(
    page.locator('button[title="Settings"], button[title*="settings" i], a[href="/settings"]').first()
      .or(page.locator('text=/DASHBOARD|NO.TRADE|TRADE|CAUTION/i').first())
  ).toBeVisible({ timeout: 10_000 });

  // Save auth state
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
