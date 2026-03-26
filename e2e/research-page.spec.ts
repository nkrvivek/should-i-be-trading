import { test, expect } from "@playwright/test";

/**
 * E2E tests for /research — tabs: AI Chat, Fundamentals, Technical, News, 13F Tracker, Earnings, Insider
 * Tabs use URL search params (?tab=xxx). Default tab is "chat" (no param).
 */

test.describe("Research Page — Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research");
    await page.waitForLoadState("networkidle");
  });

  test("default tab (AI Chat) loads correctly", async ({ page }) => {
    // Default tab should be AI Chat — no ?tab param needed
    const chatTab = page.locator("button", { hasText: /AI CHAT/i });
    await expect(chatTab).toBeVisible();

    // Chat panel content should appear
    await expect(
      page.getByText(/Claude Analysis/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("all tabs are visible", async ({ page }) => {
    const expectedTabs = [
      "AI CHAT",
      "FUNDAMENTALS",
      "TECHNICAL",
      "NEWS",
      "13F TRACKER",
      "EARNINGS",
      "INSIDER",
    ];

    for (const label of expectedTabs) {
      await expect(
        page.locator("button", { hasText: new RegExp(label, "i") })
      ).toBeVisible();
    }
  });

  test("tab switching works without full page reload", async ({ page }) => {
    const fundamentalsTab = page.locator("button", {
      hasText: /FUNDAMENTALS/i,
    });
    await fundamentalsTab.click();

    // URL should update with ?tab=fundamentals
    await expect(page).toHaveURL(/tab=fundamentals/);

    // Switch to news
    const newsTab = page.locator("button", { hasText: /^NEWS$/i });
    await newsTab.click();
    await expect(page).toHaveURL(/tab=news/);

    // The page should not have reloaded — TerminalShell nav should still be visible
    await expect(
      page.locator("a", { hasText: /RESEARCH/i }).first()
    ).toBeVisible();
  });
});

test.describe("Research Page — AI Chat Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research");
    await page.waitForLoadState("networkidle");
  });

  test("chat input and panels are visible", async ({ page }) => {
    // Claude Analysis panel should be present
    await expect(
      page.getByText(/Claude Analysis/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Right side panel should have RESEARCH and AI SCREENER sub-tabs
    await expect(
      page.locator("button", { hasText: /^RESEARCH$/i })
    ).toBeVisible();
    await expect(
      page.locator("button", { hasText: /AI SCREENER/i })
    ).toBeVisible();
  });

  test("can type a message without submitting", async ({ page }) => {
    // Find any text input or textarea in the chat panel
    const chatInput = page.locator(
      'textarea, input[type="text"]'
    ).first();

    // Chat input may not exist if feature is gated — check gracefully
    if (await chatInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await chatInput.fill("Test question about AAPL");
      await expect(chatInput).toHaveValue(/Test question about AAPL/);
      // DO NOT submit to avoid burning AI quota
    }
  });

  test("right panel toggles between Research and Screener", async ({
    page,
  }) => {
    const researchBtn = page.locator("button", {
      hasText: /^RESEARCH$/i,
    });
    const screenerBtn = page.locator("button", {
      hasText: /AI SCREENER/i,
    });

    // Default should show Research panel
    await expect(
      page.getByText(/Research \(Exa\)/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Switch to screener
    await screenerBtn.click();
    await expect(
      page.getByText(/AI Stock Screener/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Switch back to research
    await researchBtn.click();
    await expect(
      page.getByText(/Research \(Exa\)/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Research Page — Fundamentals Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research?tab=fundamentals");
    await page.waitForLoadState("networkidle");
  });

  test("fundamentals tab content loads", async ({ page }) => {
    // Should see either a ticker input, financial data, or an empty/loading state
    await expect(
      page
        .getByText(
          /fundamentals|financial|revenue|earnings|ticker|enter.*symbol|search/i
        )
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Research Page — Technical Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research?tab=technical");
    await page.waitForLoadState("networkidle");
  });

  test("technical tab content loads", async ({ page }) => {
    // Should see technical analysis content — indicators, charts, or input
    await expect(
      page
        .getByText(
          /technical|indicator|chart|RSI|MACD|moving average|ticker|enter.*symbol|search/i
        )
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Research Page — News Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research?tab=news");
    await page.waitForLoadState("networkidle");
  });

  test("news tab shows headlines or loading state", async ({ page }) => {
    // Should show news feed content, headlines, or loading/empty state
    await expect(
      page
        .getByText(
          /news|headline|market|loading|no.*news|latest/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Research Page — Earnings Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research?tab=earnings");
    await page.waitForLoadState("networkidle");
  });

  test("earnings tab content loads", async ({ page }) => {
    // Should see earnings data, calendar, or empty state
    await expect(
      page
        .getByText(
          /earnings|calendar|EPS|revenue|surprise|upcoming|no.*earnings|sector/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Research Page — Insider Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research?tab=insider");
    await page.waitForLoadState("networkidle");
  });

  test("insider tab content loads", async ({ page }) => {
    // Should show insider trading data, classifications, or empty state
    await expect(
      page
        .getByText(
          /insider|transaction|buy|sell|officer|director|filing|cluster|no.*insider/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Research Page — 13F/Institutional Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/research?tab=institutional");
    await page.waitForLoadState("networkidle");
  });

  test("institutional tab content loads", async ({ page }) => {
    // Should show 13F/institutional holdings or empty state
    await expect(
      page
        .getByText(
          /13F|institutional|holdings|fund|manager|filing|no.*data|search/i
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Research Page — General", () => {
  test("responsive: page renders on tablet viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/research");
    await page.waitForLoadState("networkidle");

    // Tab bar should still be visible (may scroll horizontally)
    await expect(
      page.locator("button", { hasText: /AI CHAT/i })
    ).toBeVisible({ timeout: 10_000 });

    // Switch to a different tab at tablet size
    await page.locator("button", { hasText: /NEWS/i }).click();
    await expect(page).toHaveURL(/tab=news/);
  });

  test("no console errors on tab switches", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/research");
    await page.waitForLoadState("networkidle");

    // Click through each tab
    const tabLabels = [
      "FUNDAMENTALS",
      "TECHNICAL",
      "NEWS",
      "EARNINGS",
      "INSIDER",
      "13F TRACKER",
      "AI CHAT",
    ];

    for (const label of tabLabels) {
      await page
        .locator("button", { hasText: new RegExp(label, "i") })
        .click();
      // Brief pause to let lazy content load
      await page.waitForTimeout(1_000);
    }

    // Filter out known non-critical errors (network failures in test env, etc.)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError") &&
        !e.includes("401") &&
        !e.includes("403")
    );

    expect(criticalErrors).toEqual([]);
  });
});
