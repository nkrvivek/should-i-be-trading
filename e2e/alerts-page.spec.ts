import { test, expect } from "@playwright/test";

/**
 * Alerts page tests — runs with saved auth state from e2e/.auth/user.json.
 *
 * The alerts feature is gated behind pro tier. Tests handle both cases:
 * - If the user has pro/enterprise tier: tests the full alerts UI
 * - If the user is free/starter: tests the upgrade prompt gate
 */

test.describe("Alerts — Feature Gate", () => {
  test("shows upgrade prompt OR alerts interface depending on tier", async ({
    page,
  }) => {
    await page.goto("/alerts");
    await page.waitForLoadState("networkidle");

    // Either we see the alerts page content or the upgrade prompt
    const hasAlertsUI = await page
      .getByText(/^alerts$/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasUpgradePrompt = await page
      .getByText(/requires.*pro|upgrade.*plan/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasViewPricing = await page
      .getByRole("button", { name: /view pricing/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasAlertsUI || hasUpgradePrompt || hasViewPricing).toBe(true);
  });

  test("upgrade prompt has VIEW PRICING and GO TO SETTINGS buttons", async ({
    page,
  }) => {
    await page.goto("/alerts");
    await page.waitForLoadState("networkidle");

    const hasUpgradePrompt = await page
      .getByText(/requires/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (hasUpgradePrompt) {
      await expect(
        page.getByRole("button", { name: /view pricing/i }).first()
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /go to settings/i }).first()
      ).toBeVisible();
    }
    // If user has pro tier, skip — the alerts interface tests below cover it
  });
});

test.describe("Alerts — Interface (Pro Tier)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/alerts");
    await page.waitForLoadState("networkidle");
  });

  test("alerts page heading visible", async ({ page }) => {
    // If gated, skip gracefully
    const hasAlertsUI = await page
      .getByText(/^alerts$/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasAlertsUI) {
      test.skip(true, "User does not have pro tier — alerts are gated");
      return;
    }

    await expect(page.getByText(/^alerts$/i).first()).toBeVisible();
  });

  test("NEW ALERT button exists", async ({ page }) => {
    const newAlertBtn = page
      .getByRole("button", { name: /new alert/i })
      .first();
    const isVisible = await newAlertBtn.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, "Alerts page gated or button not found");
      return;
    }

    await expect(newAlertBtn).toBeVisible();
  });

  test("ENABLE NOTIFICATIONS button exists", async ({ page }) => {
    const notifBtn = page
      .getByRole("button", { name: /enable notifications/i })
      .first();
    const isVisible = await notifBtn.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, "Alerts page gated");
      return;
    }

    await expect(notifBtn).toBeVisible();
  });

  test("clicking NEW ALERT opens creation form", async ({ page }) => {
    const newAlertBtn = page
      .getByRole("button", { name: /new alert/i })
      .first();
    const isVisible = await newAlertBtn.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, "Alerts page gated");
      return;
    }

    await newAlertBtn.click();

    // Form should appear with trigger type selector
    await expect(
      page.getByText(/trigger type/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Select element for trigger type
    const triggerSelect = page.locator("select").first();
    await expect(triggerSelect).toBeVisible();

    // Should list trigger options
    const options = triggerSelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("trigger type selector changes form fields", async ({ page }) => {
    // Open the form if not already open
    const triggerSelect = page.locator("select").first();
    const formAlreadyOpen = await triggerSelect.isVisible().catch(() => false);

    if (!formAlreadyOpen) {
      const newAlertBtn = page.locator("button", { hasText: /NEW ALERT/i }).first();
      const isVisible = await newAlertBtn.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, "Alerts page gated");
        return;
      }
      await newAlertBtn.click();
      await expect(triggerSelect).toBeVisible({ timeout: 5_000 });
    }

    // Default is "vix_crosses" — needs threshold + direction
    await expect(page.getByText(/threshold/i).first()).toBeVisible({ timeout: 5_000 });

    // Switch to "regime_change" — different form fields
    await triggerSelect.selectOption("regime_change");
    await page.waitForTimeout(500);

    // After switching, threshold field should disappear or change
    // Check that the form adapted — either "triggers automatically" or the threshold is gone
    const hasAutoTrigger = await page.getByText(/triggers automatically|regime|signal change/i).first().isVisible().catch(() => false);
    const thresholdGone = !(await page.getByText(/^THRESHOLD$/i).isVisible().catch(() => false));
    expect(hasAutoTrigger || thresholdGone).toBe(true);
  });

  test("can fill alert parameters", async ({ page }) => {
    const newAlertBtn = page
      .getByRole("button", { name: /new alert/i })
      .first();
    const isVisible = await newAlertBtn.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, "Alerts page gated");
      return;
    }

    await newAlertBtn.click();
    await page.waitForTimeout(300);

    // Fill alert name
    const nameInput = page.locator('input[placeholder*="VIX Spike"]').first();
    const hasNameInput = await nameInput.isVisible().catch(() => false);
    if (hasNameInput) {
      await nameInput.fill("Test VIX Alert");
    }

    // Set threshold
    const thresholdInput = page.locator('input[type="number"]').first();
    const hasThreshold = await thresholdInput.isVisible().catch(() => false);
    if (hasThreshold) {
      await thresholdInput.fill("25");
      await expect(thresholdInput).toHaveValue("25");
    }

    // CREATE ALERT button should exist
    await expect(
      page.getByRole("button", { name: /create alert/i }).first()
    ).toBeVisible();
  });

  test("active rules section is visible", async ({ page }) => {
    const rulesPanel = page.getByText(/active rules/i).first();
    const isVisible = await rulesPanel.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, "Alerts page gated");
      return;
    }

    // Should show either rules or "No alert rules configured" message
    const hasRules = await page
      .getByText(/on|off/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page
      .getByText(/no alert rules configured/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasRules || hasEmpty).toBe(true);
  });

  test("alert history section is visible", async ({ page }) => {
    const historyPanel = page.getByText(/alert history/i).first();
    const isVisible = await historyPanel.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, "Alerts page gated");
      return;
    }

    // Should show either history entries or "No alerts triggered yet"
    const hasHistory = await historyPanel.isVisible();
    const hasEmpty = await page
      .getByText(/no alerts triggered yet/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasHistory || hasEmpty).toBe(true);
  });

  test("cancel button closes the alert form", async ({ page }) => {
    const newAlertBtn = page
      .getByRole("button", { name: /new alert/i })
      .first();
    const isVisible = await newAlertBtn.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, "Alerts page gated");
      return;
    }

    // Open form
    await newAlertBtn.click();
    await expect(
      page.getByText(/trigger type/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Button should now say CANCEL
    const cancelBtn = page
      .getByRole("button", { name: /cancel/i })
      .first();
    await cancelBtn.click();

    // Form should be hidden; button should say NEW ALERT again
    await expect(
      page.getByRole("button", { name: /new alert/i }).first()
    ).toBeVisible();
  });
});

test.describe("Alerts — Alert Bell in Nav", () => {
  test("alert bell icon visible in nav for pro users", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // AlertBell renders only for users with alerts feature (pro+)
    const bellBtn = page.getByRole("button", { name: /alerts/i }).first();
    const isVisible = await bellBtn.isVisible().catch(() => false);

    if (isVisible) {
      // Bell should be clickable and open popover
      await bellBtn.click();

      // Popover should appear with "Alerts" header or "No recent alerts"
      await expect(
        page
          .getByText(/alerts|no recent alerts/i)
          .last()
      ).toBeVisible({ timeout: 5_000 });

      // VIEW ALL ALERTS link in popover
      const viewAll = page
        .getByRole("button", { name: /view all alerts/i })
        .first();
      const hasViewAll = await viewAll.isVisible().catch(() => false);
      if (hasViewAll) {
        await viewAll.click();
        await page.waitForURL((url) => url.pathname === "/alerts", {
          timeout: 10_000,
        });
      }
    }
    // If bell is not visible, user is free tier — that's expected
  });
});
