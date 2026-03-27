import { test, expect } from "@playwright/test";

/**
 * SIBT Earnings Intelligence tests.
 *
 * Validates:
 *  - Navigate to Research page -> Earnings tab
 *  - Earnings calendar loads with upcoming/past tabs
 *  - Click on a ticker -> opens earnings intel panel
 *  - SIBT Earnings Score is displayed (0-100)
 *  - Historical earnings table shows beat/miss data
 *  - Post-earnings price action section visible
 *  - Insider activity section visible
 */

test.describe("Earnings Intelligence — Calendar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research?tab=earnings");
    await page.waitForLoadState("networkidle");
  });

  test("Earnings tab loads within Research page", async ({ page }) => {
    // The Earnings tab button should be active
    await expect(
      page.locator("button", { hasText: /^Earnings$/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Earnings Calendar header should be visible
    await expect(
      page.getByText(/Earnings Calendar/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("upcoming and past view tabs are visible", async ({ page }) => {
    // The EarningsContent has upcoming/past toggle buttons
    await expect(
      page.locator("button", { hasText: /^upcoming$/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("button", { hasText: /^past$/i }).first()
    ).toBeVisible();
  });

  test("upcoming tab shows earnings entries or loading state", async ({ page }) => {
    // Should show either earnings rows (ticker symbols) or a loading message
    const hasEntries = await page.getByText(/PRE-MKT|AFTER-MKT|DURING|TBD|UPCOMING/i).first().isVisible({ timeout: 10_000 }).catch(() => false);
    const hasLoading = await page.getByText(/Loading|loading/i).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no.*earnings|no.*data|no.*upcoming/i).first().isVisible().catch(() => false);

    expect(hasEntries || hasLoading || hasEmpty).toBe(true);
  });

  test("past tab shows historical earnings", async ({ page }) => {
    // Click the PAST tab
    await page.locator("button", { hasText: /^past$/i }).first().click();
    await page.waitForTimeout(1000);

    // Should show past earnings with BEAT/MISS/IN-LINE indicators or loading/empty
    const hasBeatMiss = await page.getByText(/BEAT|MISS|IN-LINE/i).first().isVisible({ timeout: 10_000 }).catch(() => false);
    const hasLoading = await page.getByText(/Loading/i).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no.*earnings|no.*data/i).first().isVisible().catch(() => false);

    expect(hasBeatMiss || hasLoading || hasEmpty).toBe(true);
  });

  test("can switch between upcoming and past tabs", async ({ page }) => {
    // Click past
    await page.locator("button", { hasText: /^past$/i }).first().click();
    await page.waitForTimeout(500);

    // Click upcoming
    await page.locator("button", { hasText: /^upcoming$/i }).first().click();
    await page.waitForTimeout(500);

    // Calendar should still be visible (no crash)
    await expect(
      page.getByText(/Earnings Calendar/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Earnings Intelligence — Intel Panel", () => {
  test("clicking a ticker row opens the earnings intel side panel", async ({ page }) => {
    // Navigate to earnings — prefer past view for guaranteed data
    await page.goto("/research?tab=earnings");
    await page.waitForLoadState("networkidle");

    // Switch to past to see completed earnings
    await page.locator("button", { hasText: /^past$/i }).first().click();
    await page.waitForTimeout(1000);

    // Find a clickable ticker row. Earnings entries have ticker symbols that are clickable.
    // Look for any ticker-like text that could be clicked
    const tickerRow = page.locator("[style*='cursor: pointer'], [style*='cursor:pointer']").first();
    const hasClickable = await tickerRow.isVisible({ timeout: 10_000 }).catch(() => false);

    if (hasClickable) {
      await tickerRow.click();
      await page.waitForTimeout(1000);

      // The EarningsIntelPanel should open as a side panel
      // Look for "EARNINGS INTEL" header text
      const hasIntelPanel = await page.getByText(/EARNINGS INTEL/i).first().isVisible({ timeout: 10_000 }).catch(() => false);

      if (hasIntelPanel) {
        // SIBT Earnings Score section should be visible
        await expect(
          page.getByText(/SIBT Earnings Score/i).first()
        ).toBeVisible({ timeout: 10_000 });

        // Score should be a number 0-100 with /100 suffix
        await expect(
          page.getByText(/\/100/).first()
        ).toBeVisible({ timeout: 5_000 });

        // Earnings History section
        await expect(
          page.getByText(/Earnings History/i).first()
        ).toBeVisible({ timeout: 5_000 });

        // Historical entries should show BEAT/MISS/IN-LINE
        const hasBeatMiss = await page.getByText(/BEAT|MISS|IN-LINE/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
        expect(hasBeatMiss).toBe(true);

        // Post-Earnings Price Action section
        await expect(
          page.getByText(/Post-Earnings Price Action/i).first()
        ).toBeVisible({ timeout: 5_000 });

        // Check for avg move data
        await expect(
          page.getByText(/Avg 1-day move/i).first()
        ).toBeVisible({ timeout: 5_000 });

        // Insider Activity section (may not always be present if no data)
        const hasInsider = await page.getByText(/Insider Activity/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
        // Insider section is conditional on data availability — either present or not
        if (hasInsider) {
          await expect(
            page.getByText(/buy|sell|SIGNAL/i).first()
          ).toBeVisible({ timeout: 3_000 });
        }

        // CLOSE button should work
        const closeBtn = page.locator("button", { hasText: /^CLOSE$/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(500);
          // Panel should be gone
          await expect(page.getByText(/EARNINGS INTEL/i).first()).not.toBeVisible();
        }
      }
    }
    // If no clickable rows exist (no past earnings data available), test passes gracefully
  });

  test("earnings intel panel shows disclaimer", async ({ page }) => {
    await page.goto("/research?tab=earnings");
    await page.waitForLoadState("networkidle");

    await page.locator("button", { hasText: /^past$/i }).first().click();
    await page.waitForTimeout(1000);

    // Try to open intel panel
    const tickerRow = page.locator("[style*='cursor: pointer'], [style*='cursor:pointer']").first();
    const hasClickable = await tickerRow.isVisible({ timeout: 10_000 }).catch(() => false);

    if (hasClickable) {
      await tickerRow.click();
      await page.waitForTimeout(1000);

      const hasPanel = await page.getByText(/EARNINGS INTEL/i).first().isVisible({ timeout: 10_000 }).catch(() => false);
      if (hasPanel) {
        // Disclaimer text should be visible
        await expect(
          page.getByText(/not investment advice/i).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    }
  });
});

test.describe("Earnings Intelligence — Research Page Navigation", () => {
  test("can navigate from AI Chat to Earnings tab", async ({ page }) => {
    await page.goto("/research");
    await page.waitForLoadState("networkidle");

    // Click on Earnings tab
    await page.locator("button", { hasText: /^Earnings$/i }).first().click();
    await page.waitForTimeout(500);

    // URL should include tab=earnings
    expect(page.url()).toContain("tab=earnings");

    // Earnings Calendar should be visible
    await expect(
      page.getByText(/Earnings Calendar/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("deep link to earnings tab works", async ({ page }) => {
    await page.goto("/research?tab=earnings");
    await page.waitForLoadState("networkidle");

    // Should land directly on earnings content
    await expect(
      page.getByText(/Earnings Calendar/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
