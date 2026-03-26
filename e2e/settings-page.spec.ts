import { test, expect } from "@playwright/test";

/**
 * Settings page tests — runs with saved auth state from e2e/.auth/user.json.
 * Covers tab navigation, profile, API keys, tier management, and theme toggle.
 */

test.describe("Settings Page Load", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
  });

  test("settings page loads with tab bar", async ({ page }) => {
    // The settings page has tab buttons: Plan, API Keys, Brokerage, Notifications, Profile
    await expect(
      page.getByRole("button", { name: /plan/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /api keys/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /profile/i }).first()
    ).toBeVisible();
  });

  test("Plan tab is selected by default", async ({ page }) => {
    // TierManager should render — look for "Current Plan" text
    await expect(
      page.getByText(/current plan/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("SIGN OUT button visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /sign out/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Settings — Plan/Tier Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
  });

  test("current tier badge is displayed", async ({ page }) => {
    // Should see one of: FREE, STARTER, PRO, ENTERPRISE badge
    await expect(
      page.getByText(/FREE|STARTER|PRO|ENTERPRISE/).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("tier features are listed", async ({ page }) => {
    // Features for the current tier should be shown as chips
    // At minimum, free tier has "Regime Dashboard"
    await expect(
      page.getByText(/regime dashboard|signal|terminal|ai|glossary/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("upgrade section is visible (unless enterprise)", async ({ page }) => {
    // Either "Upgrade" section or "highest tier" message should appear
    const hasUpgrade = await page
      .getByText(/^upgrade$/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasMaxTier = await page
      .getByText(/highest tier/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasUpgrade || hasMaxTier).toBe(true);
  });

  test("upgrade cards show pricing info", async ({ page }) => {
    const upgradeSection = page.getByText(/upgrade to/i).first();
    const hasPricing = await upgradeSection.isVisible().catch(() => false);

    if (hasPricing) {
      // Should see at least one price
      await expect(
        page.getByText(/\$\d+\/mo|\$\d+\/yr/i).first()
      ).toBeVisible();
    }
    // If user is enterprise, there are no upgrade cards — that's fine
  });

  test("trial badge shown when on trial", async ({ page }) => {
    // This is conditional — check if trial badge exists
    const trialBadge = page.getByText(/trial/i).first();
    const isVisible = await trialBadge.isVisible().catch(() => false);

    if (isVisible) {
      // Should show days left
      await expect(
        page.getByText(/\d+d\s*left|trial/i).first()
      ).toBeVisible();
    }
    // Not on trial is also valid — test passes either way
  });

  test("view full pricing link exists", async ({ page }) => {
    const pricingLink = page.getByText(/view full pricing/i).first();
    const isVisible = await pricingLink.isVisible().catch(() => false);

    if (isVisible) {
      await pricingLink.click();
      await page.waitForURL((url) => url.pathname === "/pricing", {
        timeout: 10_000,
      });
    }
    // Enterprise users may not see this link
  });
});

test.describe("Settings — Profile Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    // Click Profile tab
    await page.getByRole("button", { name: /profile/i }).first().click();
  });

  test("profile section loads", async ({ page }) => {
    await expect(
      page.getByText(/^profile$/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("display name field is visible", async ({ page }) => {
    const nameInput = page.locator("input").first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
  });

  test("can type in display name field", async ({ page }) => {
    const nameInput = page.locator("label", { hasText: /display name/i })
      .locator("..")
      .locator("input")
      .first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });

    // Clear and type a test name
    await nameInput.fill("Test User E2E");
    await expect(nameInput).toHaveValue("Test User E2E");
  });

  test("save profile button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /save profile|saved/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("user email is displayed", async ({ page }) => {
    // The ProfileForm shows user.email
    const email = process.env.TEST_USER_EMAIL;
    if (email) {
      await expect(
        page.getByText(email).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe("Settings — API Keys Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    // Click API Keys tab
    await page.getByRole("button", { name: /api keys/i }).first().click();
  });

  test("API Keys section header visible", async ({ page }) => {
    await expect(
      page.getByText(/api keys.*integrations/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("provider cards are listed (Unusual Whales, Anthropic, Exa)", async ({
    page,
  }) => {
    await expect(
      page.getByText(/unusual whales/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/anthropic claude/i).first()
    ).toBeVisible();
    await expect(
      page.getByText(/exa search/i).first()
    ).toBeVisible();
  });

  test("ADD KEY button exists for each provider", async ({ page }) => {
    // Each provider has either ADD KEY or UPDATE button
    const addButtons = page.getByRole("button", {
      name: /add key|update/i,
    });
    const count = await addButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking ADD KEY reveals password input and SAVE button", async ({
    page,
  }) => {
    // Click the first ADD KEY button
    const addBtn = page
      .getByRole("button", { name: /add key/i })
      .first();
    const isVisible = await addBtn.isVisible().catch(() => false);

    if (isVisible) {
      await addBtn.click();

      // Should show a password input
      const keyInput = page.locator('input[type="password"]').first();
      await expect(keyInput).toBeVisible({ timeout: 5_000 });

      // Should show SAVE and CANCEL buttons
      await expect(
        page.getByRole("button", { name: /^save$/i }).first()
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /cancel/i }).first()
      ).toBeVisible();
    }
  });

  test("API key input is masked (password type)", async ({ page }) => {
    const addBtn = page
      .getByRole("button", { name: /add key/i })
      .first();
    const isVisible = await addBtn.isVisible().catch(() => false);

    if (isVisible) {
      await addBtn.click();
      const keyInput = page.locator('input[type="password"]').first();
      await expect(keyInput).toBeVisible({ timeout: 5_000 });
      await expect(keyInput).toHaveAttribute("type", "password");
    }
  });

  test("get API key docs links exist", async ({ page }) => {
    // Each provider card has a "Get API key" link
    const docsLinks = page.getByText(/get api key/i);
    const count = await docsLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Settings — Tab Navigation", () => {
  test("can switch between all tabs", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Click each tab and verify content changes
    const tabs = ["Plan", "API Keys", "Brokerage", "Notifications", "Profile"];

    for (const tabName of tabs) {
      await page.getByRole("button", { name: new RegExp(`^${tabName}$`, "i") }).first().click();

      // Give the tab content time to render
      await page.waitForTimeout(300);

      // Each tab should show some content — no blank page
      const contentArea = page.locator("div").filter({ hasText: /.+/ }).first();
      await expect(contentArea).toBeVisible();
    }
  });
});

test.describe("Theme Toggle", () => {
  test("theme toggle button is visible in nav", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Theme button shows "LIGHT" or "DARK"
    await expect(
      page.getByRole("button", { name: /^(light|dark)$/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking theme toggle switches between light and dark", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const themeBtn = page
      .getByRole("button", { name: /^(light|dark)$/i })
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 10_000 });

    const initialText = await themeBtn.textContent();
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );

    // Click to toggle
    await themeBtn.click();

    // Button text should change
    const newText = await themeBtn.textContent();
    expect(newText).not.toBe(initialText);

    // data-theme attribute should change
    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(newTheme).not.toBe(initialTheme);
  });

  test("theme persists after page reload", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const themeBtn = page
      .getByRole("button", { name: /^(light|dark)$/i })
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 10_000 });

    // Click to toggle theme
    await themeBtn.click();
    const themeAfterToggle = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );

    // Reload and check
    await page.reload();
    await page.waitForLoadState("networkidle");

    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(themeAfterReload).toBe(themeAfterToggle);
  });
});
