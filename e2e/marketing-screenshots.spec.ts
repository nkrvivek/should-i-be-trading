import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1600, height: 1400 } });

const OUTPUT_DIR = path.join("marketing", "generated");

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

test.describe("Marketing Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    ensureOutputDir();
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");
  });

  test("capture landing hero", async ({ page }) => {
    const hero = page.getByTestId("landing-hero");
    await expect(hero).toBeVisible();
    await hero.screenshot({ path: path.join(OUTPUT_DIR, "landing-hero.png") });
  });

  test("capture differentiators section", async ({ page }) => {
    const section = page.getByTestId("landing-differentiators");
    await expect(section).toBeVisible();
    await section.screenshot({ path: path.join(OUTPUT_DIR, "landing-differentiators.png") });
  });

  test("capture feature grid", async ({ page }) => {
    const section = page.getByTestId("landing-features");
    await expect(section).toBeVisible();
    await section.screenshot({ path: path.join(OUTPUT_DIR, "landing-features.png") });
  });

  test("capture pricing section", async ({ page }) => {
    const section = page.getByTestId("landing-pricing");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await section.screenshot({ path: path.join(OUTPUT_DIR, "landing-pricing.png") });
  });
});
