import { test, expect } from "@playwright/test";

test.describe("Activity Monitor — Signals > ACTIVITY tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("networkidle");
  });

  test("Activity tab is visible on Signals page with NEW badge", async ({ page }) => {
    const activityTab = page.locator("button", { hasText: /Activity/i });
    await expect(activityTab).toBeVisible({ timeout: 5_000 });

    // Should have a NEW badge
    const badge = activityTab.locator("text=NEW");
    await expect(badge).toBeVisible();
  });

  test("clicking Activity tab shows activity content", async ({ page }) => {
    await page.locator("button", { hasText: /Activity/i }).click();
    await page.waitForTimeout(500);

    // Should show either the activity content or an upgrade prompt
    const hasContent = await page
      .getByText(/Day Trading Activity/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasGate = await page
      .getByText(/upgrade.*starter|requires.*starter/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasContent || hasGate).toBe(true);
  });

  test("volume leaders section is visible with mini-tabs", async ({ page }) => {
    await page.locator("button", { hasText: /Activity/i }).click();
    await page.waitForTimeout(500);

    // If feature-gated, skip the rest
    const hasGate = await page
      .getByText(/upgrade.*starter|requires.*starter/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (hasGate) return;

    // MOST ACTIVE, GAINERS, LOSERS mini-tabs
    await expect(page.locator("button", { hasText: "MOST ACTIVE" })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("button", { hasText: "GAINERS" })).toBeVisible();
    await expect(page.locator("button", { hasText: "LOSERS" })).toBeVisible();
  });

  test("switching between mini-tabs doesn't crash", async ({ page }) => {
    await page.locator("button", { hasText: /Activity/i }).click();
    await page.waitForTimeout(500);

    // Skip if feature-gated
    const hasGate = await page
      .getByText(/upgrade.*starter|requires.*starter/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (hasGate) return;

    const miniTabs = ["MOST ACTIVE", "GAINERS", "LOSERS"];

    for (const tab of miniTabs) {
      await page.locator("button", { hasText: tab }).click();
      await page.waitForTimeout(300);

      // Page should still render content
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length).toBeGreaterThan(50);
    }

    // Return to first tab — should still work
    await page.locator("button", { hasText: "MOST ACTIVE" }).click();
    await page.waitForTimeout(200);
    await expect(page.locator("button", { hasText: "MOST ACTIVE" })).toBeVisible();
  });

  test("short interest section header is visible", async ({ page }) => {
    await page.locator("button", { hasText: /Activity/i }).click();
    await page.waitForTimeout(500);

    const hasGate = await page
      .getByText(/upgrade.*starter|requires.*starter/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (hasGate) return;

    await expect(
      page.getByText(/Short Interest/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("insider clusters section header is visible", async ({ page }) => {
    await page.locator("button", { hasText: /Activity/i }).click();
    await page.waitForTimeout(500);

    const hasGate = await page
      .getByText(/upgrade.*starter|requires.*starter/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (hasGate) return;

    await expect(
      page.getByText(/Insider Clusters/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
