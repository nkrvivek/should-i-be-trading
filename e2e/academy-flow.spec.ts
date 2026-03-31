import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Academy Flow", () => {
  test("user can learn a lesson and continue into simulator practice", async ({ page }) => {
    await page.goto("/learn");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("Course Paths").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Options Basics").first()).toBeVisible();

    await page.getByRole("button", { name: /start lesson/i }).first().click();

    await expect(page.getByText("Calls, Puts, and Contract Basics").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("What Is an Option?").first()).toBeVisible();

    await page.getByRole("button", { name: "$350.00" }).click();
    await page.getByRole("button", { name: /check answer/i }).click();

    await expect(page.getByText(/Each contract controls 100 shares/i).first()).toBeVisible();
    await expect(page.getByText(/KEY TAKEAWAYS/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Open Simulator/i }).click();
    await page.waitForURL(/\/signals\?tab=simulator/, { timeout: 10_000 });
    await expect(page.getByText(/Strategy Simulator|Simulator/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
