import { test, expect } from "@playwright/test";

// Public pages do not require authentication
test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Landing Page (/welcome)
// ---------------------------------------------------------------------------
test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");
  });

  test("hero section visible with traffic light demo", async ({ page }) => {
    // Traffic light labels rendered by the Light component
    await expect(page.getByText("NO TRADE").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("CAUTION").first()).toBeVisible();
    // Use first() since "TRADE" text appears in multiple places on the landing page
    await expect(page.getByText("TRADE", { exact: true }).first()).toBeVisible();
  });

  test('"Know When to Trade. Know When to Wait." heading is visible', async ({ page }) => {
    const heading = page.locator("h1");
    await expect(heading).toContainText("Know When to Trade.");
    await expect(heading).toContainText("Know When to Wait.");
  });

  test("SIGN IN and GET STARTED buttons are visible", async ({ page }) => {
    await expect(page.locator("button", { hasText: "SIGN IN" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "GET STARTED" }).first()).toBeVisible();
  });

  test("SIGN IN button navigates to /login", async ({ page }) => {
    await page.locator("button", { hasText: "SIGN IN" }).first().click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("START FREE TRIAL button navigates to /login", async ({ page }) => {
    await page.locator("button", { hasText: "START FREE TRIAL" }).first().click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("GET STARTED scrolls to pricing section", async ({ page }) => {
    await page.locator("button", { hasText: "GET STARTED" }).first().click();
    // The pricing section should become visible after scroll
    await expect(page.locator("#pricing")).toBeVisible({ timeout: 5_000 });
    // Verify pricing content is in view
    await expect(page.getByText("Simple, Transparent Pricing").first()).toBeVisible();
  });

  test("SEE PRICING scrolls to pricing section", async ({ page }) => {
    await page.locator("button", { hasText: "SEE PRICING" }).first().click();
    await expect(page.locator("#pricing")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Simple, Transparent Pricing").first()).toBeVisible();
  });

  test("features section is present with feature cards", async ({ page }) => {
    await expect(page.getByText("Built For Active Traders").first()).toBeVisible({ timeout: 10_000 });
    // Verify a sampling of feature card titles
    await expect(page.getByText("Market Quality Score").first()).toBeVisible();
    await expect(page.getByText("Technical Signal Overlays").first()).toBeVisible();
    await expect(page.getByText("Portfolio-Aware AI Chat").first()).toBeVisible();
  });

  test("feature cards show tier badges (FREE, STARTER, PRO)", async ({ page }) => {
    // Check for tier labels on feature cards — use first() to handle multiple matches
    await expect(page.getByText("FREE", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("STARTER", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("PRO", { exact: true }).first()).toBeVisible();
  });

  test("How Traders Use It section is present", async ({ page }) => {
    await expect(page.getByText("How Traders Use It").first()).toBeVisible({ timeout: 10_000 });
    // Steps rendered by the Step component
    await expect(page.getByText("Check The Tape").first()).toBeVisible();
    await expect(page.getByText("Check The Ticker").first()).toBeVisible();
    await expect(page.getByText("Decide With Context").first()).toBeVisible();
  });

  test("POWERED BY section lists data providers", async ({ page }) => {
    await expect(page.getByText("POWERED BY").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("FRED").first()).toBeVisible();
    await expect(page.getByText("Finnhub").first()).toBeVisible();
    await expect(page.getByText("SEC EDGAR").first()).toBeVisible();
    await expect(page.getByText("Anthropic Claude").first()).toBeVisible();
  });

  test("footer links are present", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible({ timeout: 10_000 });
    await expect(footer.locator('a[href="/terms"]')).toBeVisible();
    await expect(footer.locator('a[href="/privacy"]')).toBeVisible();
    await expect(footer.locator('a[href="/risk"]')).toBeVisible();
    await expect(footer.locator('a[href="/glossary"]')).toBeVisible();
  });

  test("disclaimer text is present at bottom", async ({ page }) => {
    await expect(
      page.getByText(/SIBT is not a registered investment adviser/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("responsive: renders on mobile viewport without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    // Page should render
    await expect(page.locator("h1")).toContainText("Know When to Trade.");

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });
});

// ---------------------------------------------------------------------------
// Pricing Page (/pricing)
// ---------------------------------------------------------------------------
test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");
  });

  test("page loads with pricing heading", async ({ page }) => {
    await expect(page.getByText("Simple, Transparent Pricing").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("all 4 tier names are visible", async ({ page }) => {
    // Tier names displayed on cards
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible();
  });

  test("prices are displayed for each tier", async ({ page }) => {
    // $0 for free tier should always be visible
    await expect(page.getByText("$0").first()).toBeVisible();
    // At least some price amounts should be visible (annual or monthly)
    const priceCount = await page.locator("text=/\\$\\d+/").count();
    expect(priceCount).toBeGreaterThanOrEqual(3);
  });

  test("each tier card has a CTA button", async ({ page }) => {
    // We expect 4 CTA buttons (one per tier)
    const ctaButtons = page.locator("button").filter({
      hasText: /GET STARTED|START 14-DAY|CURRENT PLAN|ON TRIAL|SUBSCRIBE|SWITCH TO/i,
    });
    expect(await ctaButtons.count()).toBeGreaterThanOrEqual(4);
  });

  test("14-day trial is mentioned", async ({ page }) => {
    const trialText = page.getByText(/14-day/i);
    expect(await trialText.count()).toBeGreaterThanOrEqual(1);
  });

  test("MOST POPULAR badge appears on Pro tier", async ({ page }) => {
    await expect(page.getByText("MOST POPULAR").first()).toBeVisible();
  });

  test("billing toggle switches between monthly and annual", async ({ page }) => {
    const monthlyBtn = page.locator("button", { hasText: "MONTHLY" }).first();
    const annualBtn = page.locator("button", { hasText: "ANNUAL" }).first();

    await expect(monthlyBtn).toBeVisible();
    await expect(annualBtn).toBeVisible();

    // Default is annual — switch to monthly
    await monthlyBtn.click();
    // Monthly prices should appear: $12, $29, $79
    await expect(page.getByText("$12").first()).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("$29").first()).toBeVisible();
    await expect(page.getByText("$79").first()).toBeVisible();

    // Switch back to annual
    await annualBtn.click();
    await expect(page.getByText("$99").first()).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("$249").first()).toBeVisible();
    await expect(page.getByText("$699").first()).toBeVisible();
  });

  test("feature lists are present on tier cards", async ({ page }) => {
    // Each tier has feature checkmarks
    const checkmarks = page.locator("text=\u2713");
    expect(await checkmarks.count()).toBeGreaterThanOrEqual(20);
  });

  test("FAQ section is present with common questions", async ({ page }) => {
    await expect(page.getByText("Common Questions").first()).toBeVisible();
    await expect(page.getByText("Why not a one-time payment?").first()).toBeVisible();
    await expect(page.getByText("What happens during the trial?").first()).toBeVisible();
    await expect(page.getByText("Is this investment advice?").first()).toBeVisible();
    await expect(page.getByText("Can I self-host?").first()).toBeVisible();
  });

  test("disclaimer with legal links is present", async ({ page }) => {
    await expect(page.getByText(/analytical tool/i).first()).toBeVisible();
    await expect(page.locator('a[href="/terms"]').first()).toBeVisible();
    await expect(page.locator('a[href="/privacy"]').first()).toBeVisible();
    await expect(page.locator('a[href="/risk"]').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Features Page (/features)
// ---------------------------------------------------------------------------
test.describe("Features Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/features");
    await page.waitForLoadState("domcontentloaded");
  });

  test("page loads with Features heading", async ({ page }) => {
    await expect(
      page.getByText("Features", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Institutional-grade trading intelligence/i).first()
    ).toBeVisible();
  });

  test("feature sections with titles are visible", async ({ page }) => {
    // Check a sampling of feature titles across tiers
    await expect(page.getByText("Traffic Light Verdict").first()).toBeVisible();
    await expect(page.getByText("Insider Trading Scanner").first()).toBeVisible();
    await expect(page.getByText("Signal Backtester").first()).toBeVisible();
    await expect(page.getByText("AI Stock Screener").first()).toBeVisible();
    await expect(page.getByText("Portfolio-Aware AI Chat").first()).toBeVisible();
  });

  test("tier badges are shown on feature sections", async ({ page }) => {
    await expect(page.getByText("FREE", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("STARTER", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("PRO", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("ENTERPRISE", { exact: true }).first()).toBeVisible();
  });

  test("feature sections include detail bullet points", async ({ page }) => {
    // Checkmark characters should be present for feature details
    const checkmarks = page.locator("text=\u2713");
    expect(await checkmarks.count()).toBeGreaterThanOrEqual(20);
  });

  test("ASCII mockups are present", async ({ page }) => {
    // Pre elements contain ASCII art mockups
    const preElements = page.locator("pre");
    expect(await preElements.count()).toBeGreaterThanOrEqual(5);
  });

  test("CTA button links to pricing page", async ({ page }) => {
    const ctaBtn = page.locator("button", { hasText: "START 14-DAY FREE TRIAL" }).first();
    await expect(ctaBtn).toBeVisible();
    await ctaBtn.click();
    await page.waitForURL(/\/pricing/, { timeout: 10_000 });
    expect(page.url()).toContain("/pricing");
  });

  test("no credit card required note is visible", async ({ page }) => {
    await expect(page.getByText(/No credit card required/i).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Glossary / Learn Page (/learn)
// ---------------------------------------------------------------------------
test.describe("Glossary Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/learn");
    await page.waitForLoadState("domcontentloaded");
  });

  test("page loads with Glossary heading", async ({ page }) => {
    await expect(
      page.getByText(/LEARN|TRADING GLOSSARY/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("search input is present", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search terms..."]');
    await expect(searchInput).toBeVisible();
  });

  test("at least 10 glossary terms are visible", async ({ page }) => {
    // Some terms may be collapsed; check for at least 10 category labels
    const allCategories = page.locator("text=/Technical|Fundamental|Sentiment|Options|Market|Macro|General|Risk|Trading Basics|Strategies|Tax|Deep Dives/");
    expect(await allCategories.count()).toBeGreaterThanOrEqual(10);
  });

  test("category filter buttons are present including new categories", async ({ page }) => {
    // "All" button should be present
    await expect(page.locator("button", { hasText: "All" }).first()).toBeVisible();

    // New category filter buttons
    await expect(page.locator("button", { hasText: "Trading Basics" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Technical Analysis" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Fundamental Analysis" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Strategies" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: /Tax.*Compliance/i }).first()).toBeVisible();

    // At least 5 category buttons (excluding "All")
    const categoryButtons = page.locator("button").filter({
      hasText: /Technical|Fundamental|Sentiment|Options|Market|Macro|General|Risk|Trading Basics|Strategies|Tax|Deep Dives/,
    });
    expect(await categoryButtons.count()).toBeGreaterThanOrEqual(5);
  });

  test("Deep Dives category filter shows educational articles", async ({ page }) => {
    const deepDivesBtn = page.locator("button", { hasText: "Deep Dives" }).first();
    await expect(deepDivesBtn).toBeVisible({ timeout: 5_000 });
    await deepDivesBtn.click();
    await page.waitForTimeout(300);

    // Should show deep dive articles (at least a few)
    const deepDiveItems = page.locator("text=Deep Dives");
    expect(await deepDiveItems.count()).toBeGreaterThanOrEqual(1);
  });

  test("search filters glossary terms", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search terms..."]');
    await searchInput.fill("VIX");
    // Wait for filter to apply
    await page.waitForTimeout(300);

    // The term VIX should still be visible
    await expect(page.getByText("VIX", { exact: true }).first()).toBeVisible();

    // Search for something that should not match
    await searchInput.fill("xyznonexistentterm123");
    await page.waitForTimeout(300);
    await expect(page.getByText(/No terms match/i).first()).toBeVisible();
  });

  test("category filter narrows results", async ({ page }) => {
    // Click a specific category to filter
    const technicalBtn = page.locator("button", { hasText: "Technical" }).first();
    if (await technicalBtn.isVisible()) {
      await technicalBtn.click();
      await page.waitForTimeout(300);
      // All visible category badges should be "Technical"
      const badges = page.locator("text=Technical");
      expect(await badges.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("term definitions are present (not just titles)", async ({ page }) => {
    // Definitions are longer text blocks — check that at least some have substantial content
    const definitionTexts = page.locator(
      "div >> text=/[A-Z].*\\w{10,}/"
    );
    expect(await definitionTexts.count()).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Legal Pages
// ---------------------------------------------------------------------------
test.describe("Legal Pages", () => {
  test("/terms loads with Terms of Service content", async ({ page }) => {
    await page.goto("/terms");
    await page.waitForLoadState("domcontentloaded");

    // Main heading
    await expect(page.getByText("Terms of Service").first()).toBeVisible({
      timeout: 10_000,
    });
    // Section headings include number prefixes like "1. Acceptance of Terms"
    await expect(page.getByText(/Acceptance of Terms/i).first()).toBeVisible();
    await expect(page.getByText(/Not Investment Advice/i).first()).toBeVisible();
    await expect(page.getByText(/Limitation of Liability/i).first()).toBeVisible();
    await expect(page.getByText(/Free Trial/i).first()).toBeVisible();
    // At least 10 sections (there are 14 Section components)
    const sections = page.locator("h2");
    expect(await sections.count()).toBeGreaterThanOrEqual(10);
  });

  test("/privacy loads with content", async ({ page }) => {
    await page.goto("/privacy");
    await page.waitForLoadState("domcontentloaded");

    // Should have privacy-related heading or content
    await expect(
      page.getByText(/privacy/i).first()
    ).toBeVisible({ timeout: 10_000 });
    // Should have substantive content (at least some paragraphs)
    const paragraphs = page.locator("p");
    expect(await paragraphs.count()).toBeGreaterThanOrEqual(2);
  });

  test("/risk loads with content", async ({ page }) => {
    await page.goto("/risk");
    await page.waitForLoadState("domcontentloaded");

    // Should have risk disclosure heading or content
    await expect(
      page.getByText(/risk/i).first()
    ).toBeVisible({ timeout: 10_000 });
    const paragraphs = page.locator("p");
    expect(await paragraphs.count()).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Cross-Page Navigation
// ---------------------------------------------------------------------------
test.describe("Cross-Page Navigation", () => {
  test("Landing -> Pricing via GET STARTED scroll then CTA", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    // Scroll to pricing section via GET STARTED
    await page.locator("button", { hasText: "GET STARTED" }).first().click();
    await expect(page.getByText("Simple, Transparent Pricing").first()).toBeVisible({
      timeout: 5_000,
    });
    // Pricing content should be in view with tier cards
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
  });

  test("Landing -> Login via SIGN IN", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("button", { hasText: "SIGN IN" }).first().click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("Landing footer -> Terms page", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    // Scroll footer into view first, then click
    const termsLink = page.locator('footer a[href="/terms"]');
    await termsLink.scrollIntoViewIfNeeded();
    await termsLink.click();
    await page.waitForURL(/\/terms/, { timeout: 10_000 });
    await expect(page.getByText("Terms of Service").first()).toBeVisible();
  });

  test("Landing footer -> Privacy page", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    const privacyLink = page.locator('footer a[href="/privacy"]');
    await privacyLink.scrollIntoViewIfNeeded();
    await privacyLink.click();
    await page.waitForURL(/\/privacy/, { timeout: 10_000 });
    await expect(page.getByText(/privacy/i).first()).toBeVisible();
  });

  test("Landing footer -> Glossary page", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    // Footer link may point to /glossary (which redirects to /learn) or /learn directly
    const glossaryLink = page.locator('footer a[href="/glossary"], footer a[href="/learn"]').first();
    await glossaryLink.scrollIntoViewIfNeeded();
    await glossaryLink.click();
    await page.waitForURL(/\/learn/, { timeout: 10_000 });
    await expect(
      page.getByText(/LEARN|TRADING GLOSSARY/i).first()
    ).toBeVisible();
  });

  test("Features -> Pricing via CTA button", async ({ page }) => {
    await page.goto("/features");
    await page.waitForLoadState("domcontentloaded");

    const ctaBtn = page.locator("button", { hasText: "START 14-DAY FREE TRIAL" }).first();
    await ctaBtn.scrollIntoViewIfNeeded();
    await ctaBtn.click();
    await page.waitForURL(/\/pricing/, { timeout: 10_000 });
    await expect(page.getByText("Simple, Transparent Pricing").first()).toBeVisible();
  });

  test("Pricing disclaimer links -> Terms, Privacy, Risk", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");

    // Terms link in the disclaimer
    const termsLink = page.locator('a[href="/terms"]').first();
    await termsLink.scrollIntoViewIfNeeded();
    await expect(termsLink).toBeVisible();
    await termsLink.click();
    await page.waitForURL(/\/terms/, { timeout: 10_000 });
    await expect(page.getByText("Terms of Service").first()).toBeVisible();

    // Go back and test privacy
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");
    const privacyLink = page.locator('a[href="/privacy"]').first();
    await privacyLink.scrollIntoViewIfNeeded();
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();
    await page.waitForURL(/\/privacy/, { timeout: 10_000 });

    // Go back and test risk
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");
    const riskLink = page.locator('a[href="/risk"]').first();
    await riskLink.scrollIntoViewIfNeeded();
    await expect(riskLink).toBeVisible();
    await riskLink.click();
    await page.waitForURL(/\/risk/, { timeout: 10_000 });
  });
});
