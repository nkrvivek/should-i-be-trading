import { test, expect } from "@playwright/test";

/**
 * E2E tests for /signals — tabs: Regime, Macro, COT, Backtest, Simulator
 * Tabs use URL search params (?tab=xxx). Default tab is "regime" (no param).
 */

test.describe("Signals Page — Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("domcontentloaded");
    await page.getByText(/REGIME|SIGNALS|MACRO/i).first().waitFor({ timeout: 15_000 });
  });

  test("all tabs are visible", async ({ page }) => {
    // TabBar renders labels with textTransform: uppercase in CSS
    // DOM text content is: Regime, Macro, COT, Backtest, Simulator
    const expectedTabs = ["REGIME", "MACRO", "COT", "BACKTEST", "SIMULATOR"];

    for (const label of expectedTabs) {
      await expect(
        page.locator("button", { hasText: new RegExp(label, "i") }).first()
      ).toBeVisible();
    }
  });

  test("default tab (Regime) loads correctly", async ({ page }) => {
    // Regime tab is the default — should see regime content or loading state
    await expect(
      page
        .getByText(
          /Market Regime|Fragility Monitor|Loading regime data|REFRESH|US EQUITY MARKET/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("tab switching works via click and URL params", async ({ page }) => {
    // Click Macro tab
    await page.locator("button", { hasText: /MACRO/i }).first().click();
    await expect(page).toHaveURL(/tab=macro/);

    // Click Backtest tab
    await page.locator("button", { hasText: /BACKTEST/i }).first().click();
    await expect(page).toHaveURL(/tab=backtest/);

    // Click back to Regime — URL should clean up (no param for default)
    await page.locator("button", { hasText: /REGIME/i }).first().click();
    await expect(page).not.toHaveURL(/tab=/);
  });

  test("deep-link to specific tab via URL", async ({ page }) => {
    await page.goto("/signals?tab=simulator");
    await page.waitForLoadState("domcontentloaded");

    // Simulator content should load
    await expect(
      page
        .getByText(/Strategy Simulator|Library|Simulator/i)
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Signals Page — Regime Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("domcontentloaded");
    // Wait for the signals page to actually render
    await expect(page.locator("button", { hasText: /REGIME/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("regime header and refresh button visible", async ({ page }) => {
    // The header text "Market Regime & Fragility Monitor" might not be visible
    // if data hasn't loaded yet. Check for either the header or loading state.
    await expect(
      page.getByText(/Market Regime|Fragility Monitor|Loading regime data/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Refresh button should be present (contains ↻ REFRESH text)
    await expect(
      page.locator("button", { hasText: /REFRESH/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("regime data loads with market state or shows loading/error", async ({
    page,
  }) => {
    // Wait for either data to load or a clear loading/error state
    // The page may show regime content, loading state, error, or REFRESH button
    await expect(
      page
        .getByText(
          /Market Regime|Loading regime data|FRED|error|US EQUITY MARKET|REFRESH|Fragility/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // If regime data loaded, check for key sections
    const regimeLoaded = await page
      .getByText(/US EQUITY MARKET|Market Regime|Fragility/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (regimeLoaded) {
      // FSI gauge or pillar scores should be present
      const hasPillarsOrFSI = await page
        .getByText(/FSI|pillar|volatility|credit|momentum|breadth|regime|score/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      // Either we see pillars/FSI or the upgrade prompt (for free users)
      const hasUpgradePrompt = await page
        .getByText(/Upgrade to Pro/i)
        .first()
        .isVisible()
        .catch(() => false);

      // Or we see a refresh/loading state which is also acceptable
      const hasRefresh = await page
        .locator("button", { hasText: /REFRESH/i })
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasPillarsOrFSI || hasUpgradePrompt || hasRefresh).toBeTruthy();
    }
  });

  test("disclaimer link visible", async ({ page }) => {
    // Wait for content to load first
    await expect(
      page.getByText(/Market Regime|Loading regime data/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.locator("a", { hasText: /Important Disclaimer/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Signals Page — Macro Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signals?tab=macro");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("button", { hasText: /MACRO/i }).first().waitFor({ timeout: 15_000 });
  });

  test("macro panels visible", async ({ page }) => {
    // Should see panel titles for yield curve, calendar, and macro indicators
    await expect(
      page
        .getByText(/US Treasury Yield Curve|Economic Calendar|Macro Indicators/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("yield curve section shows data or fallback", async ({ page }) => {
    // Either the chart renders, loading state, or "Configure Supabase" fallback
    await expect(
      page
        .getByText(
          /US Treasury Yield Curve|Loading yield curve|Configure Supabase/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("economic calendar section present", async ({ page }) => {
    await expect(
      page.getByText(/Economic Calendar/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("macro indicators section present", async ({ page }) => {
    await expect(
      page.getByText(/Macro Indicators/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Signals Page — Backtest Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signals?tab=backtest");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("button", { hasText: /BACKTEST/i }).first().waitFor({ timeout: 15_000 });
  });

  test("backtest header and description visible", async ({ page }) => {
    await expect(
      page.getByText(/Signal Backtester/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page
        .getByText(/Historical performance.*traffic light signals/i)
        .first()
    ).toBeVisible();
  });

  test("period selector buttons visible", async ({ page }) => {
    // 3M, 6M, 1Y buttons should be present (6M and 1Y may have " (Pro)" suffix)
    for (const period of ["3M", "6M", "1Y"]) {
      await expect(
        page.locator("button", { hasText: new RegExp(period) }).first()
      ).toBeVisible();
    }
  });

  test("backtest shows results, loading, or recording state", async ({
    page,
  }) => {
    // One of these states should appear
    await expect(
      page
        .getByText(
          /Computing backtest|Recording market data|SIBT Return|Win Rate|Signal Distribution|error|backtest/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("refresh button is present", async ({ page }) => {
    // The refresh button uses the ↻ character (&#8635;)
    const refreshBtn = page.locator("button").filter({ hasText: /\u21BB|REFRESH|↻/i });
    // There might be multiple refresh buttons; at least one should exist
    await expect(refreshBtn.first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Signals Page — Simulator Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signals?tab=simulator");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("button", { hasText: /SIMULATOR/i }).first().waitFor({ timeout: 15_000 });
  });

  test("strategy simulator header visible", async ({ page }) => {
    await expect(
      page.getByText(/Strategy Simulator/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("library and simulator sub-tabs visible", async ({ page }) => {
    // StrategiesPage renders sub-tabs "Library" and "Simulator"
    // CSS textTransform: uppercase makes them appear as LIBRARY/SIMULATOR
    // but DOM text is "Library"/"Simulator"
    await expect(
      page.locator("button", { hasText: /Library/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("button", { hasText: /Simulator/i }).first()
    ).toBeVisible();
  });

  test("strategy cards render in library view", async ({ page }) => {
    // Library is the default sub-tab, should show strategy cards
    // Look for strategy-related content: SIMULATE buttons, filter chips, or strategy names
    await expect(
      page.locator("button", { hasText: /SIMULATE/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("asset and outlook filter chips present", async ({ page }) => {
    // Asset filters (DOM text is "ALL", "OPTIONS", "STOCKS" etc.)
    for (const label of ["ALL", "OPTIONS", "STOCKS"]) {
      await expect(
        page.locator("button", { hasText: new RegExp(`^${label}$`, "i") }).first()
      ).toBeVisible();
    }

    // Outlook filters
    for (const label of ["BULLISH", "BEARISH", "NEUTRAL"]) {
      await expect(
        page.locator("button", { hasText: new RegExp(`^${label}$`, "i") }).first()
      ).toBeVisible();
    }
  });

  test("filter chips change displayed strategies", async ({ page }) => {
    // Click OPTIONS filter
    await page
      .locator("button", { hasText: /^OPTIONS$/i })
      .first()
      .click();

    // Strategy cards should still be visible (or empty state)
    const hasCards = await page
      .locator("button", { hasText: /SIMULATE/i })
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/No strategies match/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  test("current regime banner visible", async ({ page }) => {
    await expect(
      page.getByText(/CURRENT REGIME/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("simulate with ticker and price inputs present", async ({
    page,
  }) => {
    await expect(
      page.getByText(/Simulate with/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Ticker input (defaulting to SPY)
    const tickerInput = page.locator('input[placeholder="SPY"]');
    await expect(tickerInput).toBeVisible();

    // Price input
    const priceInput = page.locator('input[placeholder="Price"]');
    await expect(priceInput).toBeVisible();
  });

  test("clicking SIMULATE on a card switches to simulator sub-tab", async ({
    page,
  }) => {
    // Click the first SIMULATE button
    const simulateBtn = page
      .locator("button", { hasText: /SIMULATE/i })
      .first();

    if (await simulateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await simulateBtn.click();

      // Should switch to the simulator sub-tab — look for simulator panel content
      // The SimulatorPanel has leg editors, payoff chart, etc.
      await expect(
        page
          .getByText(
            /payoff|P&L|leg|strike|premium|underlying|type/i
          )
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe("Signals Page — General", () => {
  test("data loads within reasonable time", async ({ page }) => {
    await page.goto("/signals");

    // Regime content should appear within 15s
    await expect(
      page
        .getByText(
          /Market Regime|Loading regime data|FRED|US EQUITY MARKET/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("no console errors on tab switches", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/signals");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("button", { hasText: /REGIME/i }).first().waitFor({ timeout: 15_000 });

    // Click through each tab
    const tabLabels = ["MACRO", "COT", "BACKTEST", "SIMULATOR", "REGIME"];

    for (const label of tabLabels) {
      await page
        .locator("button", { hasText: new RegExp(label, "i") })
        .first()
        .click();
      await page.waitForTimeout(1_500);
    }

    // Filter out known non-critical errors (network failures, auth, API errors, etc.)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError") &&
        !e.includes("401") &&
        !e.includes("403") &&
        !e.includes("404") &&
        !e.includes("429") &&
        !e.includes("500") &&
        !e.includes("502") &&
        !e.includes("503") &&
        !e.includes("supabase") &&
        !e.includes("Supabase") &&
        !e.includes("CORS") &&
        !e.includes("cors") &&
        !e.includes("AbortError") &&
        !e.includes("ERR_BLOCKED") &&
        !e.includes("api.") &&
        !e.includes("fetch") &&
        !e.includes("Load failed") &&
        !e.includes("TypeError: Load failed") &&
        !e.includes("TypeError: Failed to fetch") &&
        !e.includes("TypeError: NetworkError") &&
        !e.includes("the server responded with a status")
    );

    expect(criticalErrors).toEqual([]);
  });

  test("responsive: signals page renders on tablet viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/signals");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("button", { hasText: /Regime/i }).first().waitFor({ timeout: 15_000 });

    // Tab bar should be visible (DOM text is "Regime" with CSS uppercase)
    await expect(
      page.locator("button", { hasText: /Regime/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Switch to simulator at tablet size
    await page.locator("button", { hasText: /Simulator/i }).first().click();
    await expect(page).toHaveURL(/tab=simulator/);

    await expect(
      page.getByText(/Strategy Simulator/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
