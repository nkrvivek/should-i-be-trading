import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("CSV Portfolio Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("networkidle");
  });

  test("uploads Schwab CSV and shows imported positions", async ({ page }) => {
    // Should already be on Import Portfolio tab
    const fileInput = page.locator('input[type="file"]');

    // Upload Schwab CSV
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));

    // Should show preview or import confirmation
    await expect(page.getByText(/AAPL/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/MSFT/)).toBeVisible();
    await expect(page.getByText(/GOOGL/)).toBeVisible();
  });

  test("uploads Fidelity CSV with different column names", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles(path.join(__dirname, "fixtures/fidelity-positions.csv"));

    // Should auto-detect Fidelity columns and show positions
    await expect(page.getByText(/TSLA/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/JPM/)).toBeVisible();
  });

  test("sanitizes malicious CSV content", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles(path.join(__dirname, "fixtures/malicious.csv"));

    // Should NOT execute formulas or show script tags
    await expect(page.locator("script")).toHaveCount(0);

    // The =CMD content should be stripped/sanitized — check it doesn't appear raw
    const pageContent = await page.content();
    expect(pageContent).not.toContain('=CMD("calc")');
    expect(pageContent).not.toContain("<script>alert");
    expect(pageContent).not.toContain("javascript:alert");
  });

  test("rejects files over 1MB", async ({ page }) => {
    // Create a large CSV buffer (>1MB)
    const largeContent = "Symbol,Quantity,Cost Basis\n" + "AAPL,100,18000\n".repeat(100_000);
    const largePath = path.join(__dirname, "fixtures/large-test.csv");

    const fs = await import("fs");
    fs.writeFileSync(largePath, largeContent);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largePath);

    // Should show error about file size
    await expect(page.getByText(/too large|1.*MB|size limit/i).first()).toBeVisible({ timeout: 5_000 });

    // Cleanup
    fs.unlinkSync(largePath);
  });

  test("persists imported positions after page reload", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Upload positions
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/schwab-positions.csv"));
    await expect(page.getByText(/AAPL/)).toBeVisible({ timeout: 5_000 });

    // Confirm/import if there's a button
    const importBtn = page.locator("button", { hasText: /IMPORT|CONFIRM/i });
    if (await importBtn.isVisible()) {
      await importBtn.click();
    }

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Positions should still be there (persisted in localStorage)
    await expect(page.getByText(/AAPL/).first()).toBeVisible({ timeout: 5_000 });
  });
});
