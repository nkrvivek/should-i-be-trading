import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join("marketing", "generated");

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

test.use({ viewport: { width: 1600, height: 1200 } });

test.describe("Marketing Product Screenshots", () => {
  test.beforeEach(async () => {
    ensureOutputDir();
  });

  test("capture composite screener", async ({ page }) => {
    await page.addInitScript(() => {
      const now = Date.now();
      localStorage.setItem("sibt_market_score", JSON.stringify({
        score: {
          total: 72,
          verdict: "YES",
          confidence: 0.82,
          timestamp: new Date(now).toISOString(),
        },
        sectorChanges: [
          { symbol: "XLK", change: 1.8 },
          { symbol: "XLF", change: 0.7 },
          { symbol: "XLV", change: 1.1 },
        ],
        ts: now,
      }));
      localStorage.setItem("sibt_regime_monitor", JSON.stringify({
        data: {
          compositeScore: 68,
          regime: "RISK_ON",
          confidence: 0.79,
          timestamp: new Date(now).toISOString(),
        },
        ts: now,
      }));
      localStorage.setItem("sibt_stock_metrics_cache", JSON.stringify({
        data: [
          {
            symbol: "NVDA",
            sector: "Technology",
            pe: 58,
            forwardPe: 41,
            dividendYield: 0.0004,
            marketCap: 2800000000000,
            eps: 12.4,
            revenueGrowthQuarterly: 0.78,
            profitMargin: 0.49,
            beta: 1.7,
            fiftyTwoWeekHigh: 142,
            fiftyTwoWeekLow: 59,
            currentPrice: 131.52,
          },
          {
            symbol: "MSFT",
            sector: "Technology",
            pe: 35,
            forwardPe: 31,
            dividendYield: 0.007,
            marketCap: 3100000000000,
            eps: 11.9,
            revenueGrowthQuarterly: 0.16,
            profitMargin: 0.36,
            beta: 0.89,
            fiftyTwoWeekHigh: 468,
            fiftyTwoWeekLow: 367,
            currentPrice: 421.33,
          },
          {
            symbol: "JPM",
            sector: "Financials",
            pe: 13,
            forwardPe: 12,
            dividendYield: 0.021,
            marketCap: 558000000000,
            eps: 18.2,
            revenueGrowthQuarterly: 0.09,
            profitMargin: 0.29,
            beta: 1.05,
            fiftyTwoWeekHigh: 210,
            fiftyTwoWeekLow: 167,
            currentPrice: 198.77,
          },
        ],
        ts: now,
        universeSize: 250,
      }));
    });

    await page.goto("/research?tab=composite");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("composite-content")).toBeVisible();
    await expect(page.getByText("Composite Trade Screener")).toBeVisible();
    await page.getByTestId("composite-rankings").screenshot({ path: path.join(OUTPUT_DIR, "product-composite.png") });
  });

  test("capture social sentiment screen", async ({ page }) => {
    await page.route("**/functions/v1/proxy-social?source=stocktwits&action=trending**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbols: [
            { id: 1, symbol: "NVDA", title: "NVIDIA", watchlist_count: 155000 },
            { id: 2, symbol: "TSLA", title: "Tesla", watchlist_count: 121000 },
            { id: 3, symbol: "AAPL", title: "Apple", watchlist_count: 118000 },
          ],
        }),
      });
    });
    await page.route("**/functions/v1/proxy-social?source=stocktwits&action=sentiment&symbol=NVDA**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          messages: [
            { id: 1, body: "NVDA momentum looks strong", created_at: "2026-03-31T14:00:00Z", user: { username: "alpha" }, entities: { sentiment: { basic: "Bullish" } } },
            { id: 2, body: "Still buying dips", created_at: "2026-03-31T14:10:00Z", user: { username: "delta" }, entities: { sentiment: { basic: "Bullish" } } },
            { id: 3, body: "Valuation rich but trend intact", created_at: "2026-03-31T14:15:00Z", user: { username: "gamma" }, entities: { sentiment: { basic: "Bearish" } } },
          ],
          symbol: { symbol: "NVDA" },
        }),
      });
    });
    await page.route("**/functions/v1/proxy-social?source=reddit&action=search&symbol=NVDA**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            children: [
              { data: { title: "NVDA still the AI leader", selftext: "bullish setup into next quarter", author: "wsb_one", score: 422, num_comments: 90, created_utc: 1711890000, permalink: "/r/stocks/1", subreddit: "stocks" } },
              { data: { title: "Anyone shorting NVDA here?", selftext: "puts feel early", author: "wsb_two", score: 178, num_comments: 54, created_utc: 1711890600, permalink: "/r/options/2", subreddit: "options" } },
            ],
          },
        }),
      });
    });
    await page.route("**/functions/v1/proxy-exa?endpoint=/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            { title: "NVDA chatter remains elevated", url: "https://example.com/1", publishedDate: "2026-03-31T14:00:00Z", text: "Strong desk chatter around AI demand.", score: 0.82 },
            { title: "FinTwit watches NVDA breakout", url: "https://example.com/2", publishedDate: "2026-03-31T14:02:00Z", text: "Traders focused on continuation above resistance.", score: 0.78 },
          ],
        }),
      });
    });
    await page.route("**/functions/v1/finnhub?endpoint=quote&symbol=NVDA", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ c: 131.52, d: 2.14, dp: 1.65 }),
      });
    });
    await page.route("**/functions/v1/fmp", async (route) => {
      const body = route.request().postDataJSON?.() as { endpoint?: string; symbol?: string } | undefined;
      if (body?.endpoint === "profile" && body?.symbol === "NVDA") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                symbol: "NVDA",
                companyName: "NVIDIA Corporation",
                price: 131.52,
                marketCap: 2800000000000,
                beta: 1.7,
                change: 2.14,
                changePercentage: 1.65,
                volume: 42000000,
                averageVolume: 39000000,
                sector: "Technology",
                industry: "Semiconductors",
                country: "US",
                exchange: "NASDAQ",
                description: "",
                ceo: "",
                fullTimeEmployees: "29600",
                ipoDate: "1999-01-22",
                website: "https://nvidia.com",
                range: "59-142",
                lastDividend: 0.04,
                isEtf: false,
                isActivelyTrading: true,
              },
            ],
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/research?tab=social");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("textbox").fill("NVDA");
    await page.getByRole("button", { name: "SCAN" }).click();
    await expect(page.getByTestId("social-ticker-bar")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("social-results")).toBeVisible();
    await page.getByTestId("social-content").screenshot({ path: path.join(OUTPUT_DIR, "product-social.png") });
  });

  test("capture order review modal", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("sibt-broker-connections", JSON.stringify([
        { id: "mock-alpaca-1", slug: "alpaca", displayName: "Alpaca (Paper)", credentials: { apiKey: "test", apiSecret: "test" } },
      ]));
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));

    const importBtn = page.getByRole("button", { name: /IMPORT \d+ POSITIONS/i });
    if (await importBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await importBtn.click();
      await page.waitForTimeout(500);
    }

    await page.locator("button", { hasText: /STRATEGIES/i }).click();
    const executeBtn = page.locator("button", { hasText: /^execute$/i }).first();
    await expect(executeBtn).toBeVisible({ timeout: 10_000 });
    await executeBtn.click();

    await expect(page.getByTestId("order-review-modal")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("order-review-modal").screenshot({ path: path.join(OUTPUT_DIR, "product-order-review.png") });
  });
});
