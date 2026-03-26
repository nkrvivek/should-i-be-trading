import { test, expect } from "@playwright/test";

/**
 * Auth flow tests — these run WITHOUT saved storage state
 * so they can test the login/logout/protection cycle from scratch.
 */
test.use({ storageState: undefined });

test.describe("Login Page", () => {
  test("login page loads with email and password fields", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible();
  });

  test("login page shows sign-in heading", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/sign in to your account/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("login page has OAuth buttons (Google, X)", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // OAuth buttons render as <button> elements with text "Continue with Google" / "Continue with X"
    await expect(
      page.locator("button", { hasText: /Continue with Google/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("button", { hasText: /Continue with X/i }).first()
    ).toBeVisible();
  });

  test("login page has toggle to sign-up mode", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const toggleBtn = page.getByText(/need an account\? sign up/i).first();
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 });

    await toggleBtn.click();
    await expect(
      page.getByText(/create your account/i).first()
    ).toBeVisible();

    // Display Name field should appear in signup mode
    await expect(
      page.locator('input[placeholder="Your name"]').first()
    ).toBeVisible();
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    await emailInput.fill("fake-user@nonexistent-domain-xyz.com");
    await passwordInput.fill("wrong-password-123");

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should show an error message (Supabase returns "Invalid login credentials" or similar)
    await expect(
      page.getByText(/invalid|error|failed|incorrect|auth/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(!email || !password, "Missing TEST_USER_EMAIL/TEST_USER_PASSWORD");
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await emailInput.fill(email);
    await passwordInput.fill(password);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should redirect away from /login to dashboard
    await page.waitForURL(
      (url) => url.pathname === "/" || url.pathname === "/dashboard",
      { timeout: 15_000 }
    );

    // Verify authenticated state — avatar button (settings) should appear
    // The button has title={displayName ?? "Settings"} and contains an SVG avatar
    await expect(
      page.locator('button[title]').filter({ has: page.locator("svg") }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("session persists after page reload", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(!email || !password, "Missing TEST_USER_EMAIL/TEST_USER_PASSWORD");
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForURL(
      (url) => url.pathname === "/" || url.pathname === "/dashboard",
      { timeout: 15_000 }
    );

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be on dashboard, not redirected to login
    expect(page.url()).not.toContain("/login");

    // Avatar button should still be visible (authenticated)
    await expect(
      page.locator('button[title]').filter({ has: page.locator("svg") }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Logout", () => {
  test("user can log out from settings page", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(!email || !password, "Missing TEST_USER_EMAIL/TEST_USER_PASSWORD");
      return;
    }

    // Log in first
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(
      (url) => url.pathname === "/" || url.pathname === "/dashboard",
      { timeout: 15_000 }
    );

    // Navigate to settings
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Click SIGN OUT button
    const signOutBtn = page.locator("button", { hasText: /sign out/i }).first();
    await expect(signOutBtn).toBeVisible({ timeout: 10_000 });
    await signOutBtn.click();

    // Should redirect to login or landing page
    await page.waitForURL(
      (url) =>
        url.pathname === "/login" ||
        url.pathname === "/welcome" ||
        url.pathname === "/",
      { timeout: 15_000 }
    );
  });

  test("after logout, /settings redirects to login", async ({ page }) => {
    // Without auth state, /settings should redirect
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Should redirect to /login
    await page.waitForURL((url) => url.pathname === "/login", {
      timeout: 15_000,
    });
  });
});

test.describe("Auth Protection", () => {
  test("/settings redirects to login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await page.waitForURL((url) => url.pathname === "/login", {
      timeout: 15_000,
    });

    // Login form should be visible
    await expect(
      page.locator('input[type="email"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("/alerts shows upgrade prompt or redirects when not authenticated", async ({
    page,
  }) => {
    await page.goto("/alerts");
    await page.waitForLoadState("networkidle");

    // /alerts uses GatedPage which checks tier, not RequireAuth.
    // For unauthenticated users, effectiveTier() returns "free" so they see UpgradePrompt.
    // We accept either: upgrade prompt visible, or redirect to login.
    const hasUpgradePrompt = await page
      .getByText(/requires|upgrade/i)
      .first()
      .isVisible()
      .catch(() => false);
    const isLoginPage = page.url().includes("/login");

    expect(hasUpgradePrompt || isLoginPage).toBe(true);
  });

  test("landing page shows for unauthenticated users at /", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // SmartHome shows LandingPage for unauthenticated users
    // Look for sign-in link/button or landing page content
    const hasSignIn = await page
      .locator("button, a")
      .filter({ hasText: /sign in/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasLandingContent = await page
      .getByText(/should.*be trading|SIBT|market intelligence|right now/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasSignIn || hasLandingContent).toBe(true);
  });
});
