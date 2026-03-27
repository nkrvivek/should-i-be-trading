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
    const importBtn = page.getByRole("button", { name: /IMPORT \d+ POSITIONS/i });
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

    // Wait for and click the import action button
    const importBtn = page.getByRole("button", { name: /IMPORT \d+ POSITIONS/i });
    await expect(importBtn).toBeVisible({ timeout: 5_000 });
    await importBtn.click();
    await page.waitForTimeout(500);

    // Go to strategies
    await page.locator("button", { hasText: /STRATEGIES/i }).click();

    // AAPL (200), MSFT (150), GOOGL (100) should have covered call suggestions
    const analysisPanel = page.locator("text=/STRATEGY ANALYSIS/i").first();
    await expect(analysisPanel).toBeVisible({ timeout: 5_000 });

    // Look for strategy suggestions (covered call, protective put, etc.)
    await expect(page.getByText(/covered call/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("simulate button exists on suggestions", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));

    const importBtn = page.getByRole("button", { name: /IMPORT \d+ POSITIONS/i });
    await expect(importBtn).toBeVisible({ timeout: 5_000 });
    await importBtn.click();
    await page.waitForTimeout(500);

    await page.locator("button", { hasText: /STRATEGIES/i }).click();

    // Look for SIMULATE buttons
    const simulateBtn = page.locator("button", { hasText: /SIMULATE/i }).first();
    await expect(simulateBtn).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Strategy Sub-Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    // Navigate to Strategies tab
    await page.locator("button", { hasText: /STRATEGIES/i }).click();
    await page.waitForTimeout(300);
  });

  test("all 4 sub-tab buttons are visible on Strategies tab", async ({ page }) => {
    await expect(page.locator("button", { hasText: "STRATEGY SUGGESTER" })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("button", { hasText: "COVERED CALLS" })).toBeVisible();
    await expect(page.locator("button", { hasText: "CASH-SECURED PUTS" })).toBeVisible();
    await expect(page.locator("button", { hasText: "WASH SALE" })).toBeVisible();
  });

  test("clicking COVERED CALLS sub-tab shows covered call panel", async ({ page }) => {
    await page.locator("button", { hasText: "COVERED CALLS" }).click();
    await expect(page.getByText(/Covered Call Opportunities/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking CASH-SECURED PUTS sub-tab shows CSP panel", async ({ page }) => {
    await page.locator("button", { hasText: "CASH-SECURED PUTS" }).click();
    // CSP panel content should render
    await expect(page.getByText(/cash.secured put/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking WASH SALE sub-tab shows wash sale monitor", async ({ page }) => {
    await page.locator("button", { hasText: "WASH SALE" }).click();
    // Wash sale monitor panel should render
    await expect(page.getByText(/wash sale/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("sub-tabs switch without page reload", async ({ page }) => {
    const initialUrl = page.url();

    // Click through each sub-tab and verify URL stays the same
    await page.locator("button", { hasText: "COVERED CALLS" }).click();
    await page.waitForTimeout(200);
    expect(page.url()).toBe(initialUrl);

    await page.locator("button", { hasText: "CASH-SECURED PUTS" }).click();
    await page.waitForTimeout(200);
    expect(page.url()).toBe(initialUrl);

    await page.locator("button", { hasText: "WASH SALE" }).click();
    await page.waitForTimeout(200);
    expect(page.url()).toBe(initialUrl);

    await page.locator("button", { hasText: "STRATEGY SUGGESTER" }).click();
    await page.waitForTimeout(200);
    expect(page.url()).toBe(initialUrl);
  });

  test("Covered Calls badge shows count when positions have 100+ shares", async ({ page }) => {
    // Go back to Import Portfolio tab and upload positions
    await page.locator("button", { hasText: /IMPORT PORTFOLIO/i }).click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));

    const importBtn = page.getByRole("button", { name: /IMPORT \d+ POSITIONS/i });
    await expect(importBtn).toBeVisible({ timeout: 5_000 });
    await importBtn.click();
    await page.waitForTimeout(500);

    // Switch back to Strategies
    await page.locator("button", { hasText: /STRATEGIES/i }).click();

    // COVERED CALLS button should have a badge with a count (AAPL=200, MSFT=150, GOOGL=100)
    const coveredCallsBtn = page.locator("button", { hasText: "COVERED CALLS" });
    await expect(coveredCallsBtn).toBeVisible({ timeout: 5_000 });
    // Badge is a span inside the button with a numeric count
    const badge = coveredCallsBtn.locator("span").filter({ hasText: /^\d+$/ });
    await expect(badge).toBeVisible({ timeout: 5_000 });
    const badgeText = await badge.textContent();
    expect(Number(badgeText)).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Wash Sale Monitor", () => {
  test("wash sale panel renders on strategies tab", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    await page.locator("button", { hasText: /STRATEGIES/i }).click();

    // Wash sale sub-tab should be visible
    await expect(page.locator("button", { hasText: "WASH SALE" })).toBeVisible({ timeout: 5_000 });

    // Click wash sale sub-tab to see the monitor
    await page.locator("button", { hasText: "WASH SALE" }).click();
    await expect(page.getByText(/wash sale/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
