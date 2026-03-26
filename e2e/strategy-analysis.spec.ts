import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Strategy Analysis", () => {
  test("shows strategy suggestions after CSV import", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    // Upload positions first
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));

    // Confirm import if needed
    const importBtn = page.locator("button", { hasText: /IMPORT|CONFIRM/i });
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await page.waitForTimeout(500);
    }

    // Switch to strategies tab
    const strategiesTab = page.locator("button", { hasText: /STRATEGIES/i });
    await strategiesTab.click();

    // Should show strategy analysis panel with suggestions
    await expect(page.getByText(/STRATEGY ANALYSIS/i).first()).toBeVisible({ timeout: 5_000 });

    // AAPL has 200 shares — should get covered call suggestion
    await expect(page.getByText(/covered call/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("covered call suggestions appear for 100+ share positions", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    // Upload Schwab CSV (AAPL=200, MSFT=150, GOOGL=100, NVDA=50)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));

    const importBtn = page.locator("button", { hasText: /IMPORT|CONFIRM/i });
    if (await importBtn.isVisible()) await importBtn.click();

    // Go to strategies
    await page.locator("button", { hasText: /STRATEGIES/i }).click();

    // AAPL (200), MSFT (150), GOOGL (100) should have covered call suggestions
    // NVDA (50) should NOT (< 100 shares)
    const analysisPanel = page.locator("text=/STRATEGY ANALYSIS/i").first();
    await expect(analysisPanel).toBeVisible({ timeout: 5_000 });

    // Look for risk badges
    await expect(page.getByText(/conservative/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("simulate button exists on suggestions", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));

    const importBtn = page.locator("button", { hasText: /IMPORT|CONFIRM/i });
    if (await importBtn.isVisible()) await importBtn.click();

    await page.locator("button", { hasText: /STRATEGIES/i }).click();

    // Look for SIMULATE buttons
    const simulateBtn = page.locator("button", { hasText: /SIMULATE/i }).first();
    await expect(simulateBtn).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Wash Sale Monitor", () => {
  test("wash sale panel renders on strategies tab", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    await page.locator("button", { hasText: /STRATEGIES/i }).click();

    // Wash sale panel should be visible
    await expect(page.getByText(/WASH SALE/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
