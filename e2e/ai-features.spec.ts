import { test, expect } from "@playwright/test";

test.describe("AI Features — Usage Tracking", () => {
  test("AI usage badge shows on dashboard chat", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for AI usage badge (shows X/Y AI calls or OWN KEY)
    const badge = page.locator("text=/\\d+\\/\\d+ AI calls|OWN KEY|LIMIT REACHED/i").first();
    await expect(badge).toBeVisible({ timeout: 10_000 });
  });

  test("AI chat sends message and gets response", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Find chat input
    const chatInput = page.locator('input[placeholder*="market" i], textarea[placeholder*="market" i]').first();

    // Skip if chat isn't visible (might be gated)
    if (!(await chatInput.isVisible())) {
      test.skip();
      return;
    }

    await chatInput.fill("What is the current market regime?");

    // Find and click send button
    const sendBtn = page.locator("button", { hasText: /SEND/i }).first();
    await sendBtn.click();

    // Wait for response (AI response appears in chat)
    await expect(page.locator('[role="assistant"], .assistant-message, div:has-text("market")').last()).toBeVisible({ timeout: 30_000 });

    // Usage badge should update after the call
    const updatedBadge = page.locator("text=/[1-9]\\d*\\/\\d+ AI calls|OWN KEY/i").first();
    await expect(updatedBadge).toBeVisible({ timeout: 5_000 });
  });

  test("AI chat disables when limit reached", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // If LIMIT REACHED is showing, input should be disabled
    const limitBadge = page.locator("text=LIMIT REACHED");
    if (await limitBadge.isVisible()) {
      const chatInput = page.locator('input[placeholder*="limit" i], input[disabled]').first();
      await expect(chatInput).toBeDisabled();
    }
  });
});

test.describe("AI Features — Screener", () => {
  test("AI screener page loads with usage badge", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to AI screener tab if it exists
    const screenerTab = page.locator("button", { hasText: /SCREENER|SCAN/i }).first();
    if (await screenerTab.isVisible()) {
      await screenerTab.click();

      // Usage badge should be visible
      await expect(page.locator("text=/\\d+\\/\\d+ AI calls|OWN KEY/i").first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
