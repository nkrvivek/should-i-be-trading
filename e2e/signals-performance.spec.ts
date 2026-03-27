import { test, expect } from "@playwright/test";

/**
 * Signals page tab switching and performance tests.
 *
 * Validates the visited-tabs pattern (mount once, display:none) that
 * prevents the freeze bug. Tests:
 *  - Navigate to /signals
 *  - Switch between all tabs (Regime, Macro, COT, Backtest, Simulator)
 *  - Return to Regime tab — page should not freeze (content visible within 5s)
 *  - Rapid tab switching — no crash
 *  - Data persists when returning to a previously visited tab
 */

test.describe("Signals Page — Tab Switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("networkidle");
  });

  test("signals page loads with all 5 tab buttons", async ({ page }) => {
    await expect(page.locator("button", { hasText: /^Regime$/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("button", { hasText: /^Macro$/i }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: /^COT$/i }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: /^Backtest$/i }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: /^Simulator$/i }).first()).toBeVisible();
  });

  test("Regime tab is active by default", async ({ page }) => {
    // Should show regime content or loading state
    await expect(
      page.getByText(/regime|composite regime|market quality|SIBT.*Score|Loading/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("can switch to Macro tab", async ({ page }) => {
    await page.locator("button", { hasText: /^Macro$/i }).first().click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText(/macro|yield.*curve|economic|fed|unemployment|gdp|Loading/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can switch to COT tab", async ({ page }) => {
    await page.locator("button", { hasText: /^COT$/i }).first().click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText(/cot|commitment.*traders|positioning|commercial|Loading/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can switch to Backtest tab", async ({ page }) => {
    await page.locator("button", { hasText: /^Backtest$/i }).first().click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText(/backtest|back.*test|strategy|historical|Loading/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can switch to Simulator tab", async ({ page }) => {
    await page.locator("button", { hasText: /^Simulator$/i }).first().click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText(/simulator|payoff|p&l|option|Loading/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Signals Page — Freeze Prevention", () => {
  test("return to Regime tab after visiting others does not freeze", async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("networkidle");

    // Visit Regime first (default)
    await expect(
      page.getByText(/regime|composite regime|market quality|Loading/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Switch to Macro
    await page.locator("button", { hasText: /^Macro$/i }).first().click();
    await page.waitForTimeout(1000);

    // Switch to COT
    await page.locator("button", { hasText: /^COT$/i }).first().click();
    await page.waitForTimeout(1000);

    // Return to Regime — should NOT freeze (content visible within 5s)
    await page.locator("button", { hasText: /^Regime$/i }).first().click();

    await expect(
      page.getByText(/regime|composite regime|market quality|SIBT.*Score/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("rapid tab switching 3 times does not crash", async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("networkidle");

    const tabs = ["Macro", "COT", "Backtest", "Simulator", "Regime"];

    // Rapid cycle 1
    for (const tab of tabs) {
      await page.locator("button", { hasText: new RegExp(`^${tab}$`, "i") }).first().click();
      await page.waitForTimeout(200);
    }

    // Rapid cycle 2
    for (const tab of tabs) {
      await page.locator("button", { hasText: new RegExp(`^${tab}$`, "i") }).first().click();
      await page.waitForTimeout(200);
    }

    // Rapid cycle 3
    for (const tab of tabs) {
      await page.locator("button", { hasText: new RegExp(`^${tab}$`, "i") }).first().click();
      await page.waitForTimeout(200);
    }

    // Page should still be responsive — verify content is visible
    await expect(
      page.getByText(/regime|composite regime|market quality|Loading/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Verify the page didn't crash by checking the tab bar is still there
    await expect(page.locator("button", { hasText: /^Macro$/i }).first()).toBeVisible();
  });

  test("data persists when returning to a previously visited tab", async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("networkidle");

    // Wait for Regime content to load
    await expect(
      page.getByText(/regime|composite regime|market quality|SIBT.*Score|Loading/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Switch away
    await page.locator("button", { hasText: /^Macro$/i }).first().click();
    await page.waitForTimeout(1000);

    // Switch back to Regime
    await page.locator("button", { hasText: /^Regime$/i }).first().click();
    await page.waitForTimeout(500);

    // The Regime content should still be present (no re-fetch needed)
    await expect(
      page.getByText(/regime|composite regime|market quality|SIBT.*Score/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Verify the tab content area has meaningful text (not blank)
    const currentBodyText = await page.locator("body").innerText();
    expect(currentBodyText.length).toBeGreaterThan(100);
  });
});
