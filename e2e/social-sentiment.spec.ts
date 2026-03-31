import { test, expect } from "@playwright/test";

test.describe("Social Sentiment — Research > SOCIAL tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research");
    await page.waitForLoadState("networkidle");
  });

  test("Social tab is visible on Research page with NEW badge", async ({ page }) => {
    const socialTab = page.locator("button", { hasText: /Social/i });
    await expect(socialTab).toBeVisible({ timeout: 5_000 });

    // Should have a NEW badge inside or near the tab button
    const badge = socialTab.locator("text=NEW");
    await expect(badge).toBeVisible();
  });

  test("clicking Social tab shows sentiment form with ticker input and SCAN button", async ({ page }) => {
    await page.locator("button", { hasText: /Social/i }).click();
    await page.waitForTimeout(300);

    // Ticker input should be present
    const tickerInput = page.locator('input[placeholder*="ticker"]');
    await expect(tickerInput).toBeVisible({ timeout: 5_000 });

    // SCAN button should be present
    const scanBtn = page.locator("button", { hasText: "SCAN" });
    await expect(scanBtn).toBeVisible();
  });

  test("ticker input accepts text and shows uppercase", async ({ page }) => {
    await page.locator("button", { hasText: /Social/i }).click();
    await page.waitForTimeout(300);

    const tickerInput = page.locator('input[placeholder*="ticker"]');
    await tickerInput.fill("aapl");

    // Input should display uppercase
    await expect(tickerInput).toHaveValue("AAPL");
  });

  test("empty scan doesn't crash (no ticker entered)", async ({ page }) => {
    await page.locator("button", { hasText: /Social/i }).click();
    await page.waitForTimeout(300);

    // Click SCAN without entering anything
    const scanBtn = page.locator("button", { hasText: "SCAN" });
    await scanBtn.click();
    await page.waitForTimeout(500);

    // Page should still be functional — no error overlay, no blank screen
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);

    // The form should still be visible
    await expect(page.locator('input[placeholder*="ticker"]')).toBeVisible();
  });

  test("description text is visible", async ({ page }) => {
    await page.locator("button", { hasText: /Social/i }).click();
    await page.waitForTimeout(300);

    await expect(
      page.getByText(/Real-time sentiment from StockTwits, Reddit, and FinTwit/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
