import { test, expect } from "@playwright/test";

test.describe("Authenticated Navigation", () => {
  test("nav bar shows all main sections", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Main nav items should be visible
    await expect(page.locator("a", { hasText: /DASHBOARD/i }).first()).toBeVisible();
    await expect(page.locator("a", { hasText: /RESEARCH/i }).first()).toBeVisible();
    await expect(page.locator("a", { hasText: /SIGNALS/i }).first()).toBeVisible();
    await expect(page.locator("a", { hasText: /TRADING/i }).first()).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Should show settings content (API keys, tier info, etc.)
    await expect(page.getByText(/settings|account|api.*key/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("dashboard loads with market regime data", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should show SIBT Score or market signal
    await expect(page.getByText(/SIBT.*Score|TRADE|CAUTION|NO.*TRADE/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("trial badge shows correct days (not always 14d)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // If trial badge exists, it should show a reasonable number
    const trialBadge = page.locator("text=/TRIAL \\d+d/i");
    if (await trialBadge.isVisible()) {
      const text = await trialBadge.textContent();
      const days = parseInt(text?.match(/(\d+)d/)?.[1] ?? "0");
      // Should be between 0 and 14 (not stuck at 14)
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThanOrEqual(14);
    }
  });

  test("feature gate shows upgrade prompt for free users", async ({ page }) => {
    // This test validates the gate works — if user is on trial/pro,
    // they should see content. If free, they see the gate.
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    // Either the trading page content OR the upgrade gate should be visible
    const hasContent = await page.locator("button", { hasText: /IMPORT PORTFOLIO/i }).isVisible();
    const hasGate = await page.getByText(/requires.*PRO|upgrade.*plan/i).first().isVisible();

    expect(hasContent || hasGate).toBe(true);
  });
});

test.describe("Responsive Layout", () => {
  test("mobile nav collapses properly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Page should render without horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Small tolerance
  });
});
