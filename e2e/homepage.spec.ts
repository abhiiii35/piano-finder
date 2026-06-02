import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("renders hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("expert care");
    await expect(page.locator("text=Find Tuners")).toBeVisible();
  });

  test("renders how it works section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2", { hasText: "How it works" })).toBeVisible();
    await expect(page.locator("text=Easy Discovery")).toBeVisible();
    await expect(page.locator("text=Instant Booking").first()).toBeVisible();
  });

  test("renders technician section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Replace your entire tool stack")).toBeVisible();
  });

  test("search bar navigates to search page", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[placeholder*="city or zip"]').fill("Boston");
    await page.locator("button", { hasText: "Find Tuners" }).click();
    await expect(page).toHaveURL(/\/search\?q=Boston/);
  });

  test("header navigation links work", async ({ page }) => {
    await page.goto("/");
    await page.locator("header a", { hasText: "Find a Tuner" }).click();
    await expect(page).toHaveURL("/search");
  });
});
