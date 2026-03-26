import { test, expect } from "@playwright/test";

test.describe("Trading Page — Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");
  });

  test("defaults to Import Portfolio tab", async ({ page }) => {
    // Import Portfolio should be the active/default tab
    const importTab = page.locator("button", { hasText: /IMPORT PORTFOLIO/i });
    await expect(importTab).toBeVisible();

    // The upload area should be visible
    await expect(page.getByText(/drag.*drop|choose.*file|upload.*csv/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("Strategies tab is always visible without broker", async ({ page }) => {
    const strategiesTab = page.locator("button", { hasText: /STRATEGIES/i });
    await expect(strategiesTab).toBeVisible();
    await strategiesTab.click();

    // Strategy analysis panel should render
    await expect(page.getByText(/STRATEGY ANALYSIS|strategy/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("broker tabs hidden when no broker connected", async ({ page }) => {
    // These tabs should NOT be visible without a broker
    await expect(page.locator("button", { hasText: /^PORTFOLIO$/i })).not.toBeVisible();
    await expect(page.locator("button", { hasText: /^ORDERS$/i })).not.toBeVisible();
    await expect(page.locator("button", { hasText: /^FLOW$/i })).not.toBeVisible();
    await expect(page.locator("button", { hasText: /^JOURNAL$/i })).not.toBeVisible();
  });
});
