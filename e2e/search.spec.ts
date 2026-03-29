import { test, expect } from "@playwright/test";

test.describe("Search & Technician Profiles", () => {
  test("search page renders with results", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator("h1")).toContainText("Find Piano Tuners");
    // Should show the seeded technician (displays user.name)
    await expect(page.locator("text=Test Technician")).toBeVisible();
  });

  test("search page shows technician card details", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator("text=Test Technician")).toBeVisible();
    // Should show location
    await expect(page.locator("text=Boston, MA").first()).toBeVisible();
  });

  test("clicking a technician card navigates to profile", async ({ page }) => {
    await page.goto("/search");
    await page.locator("text=Test Technician").first().click();
    await expect(page).toHaveURL(/\/technicians\//);
  });

  test("technician profile shows services and reviews", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("text=Standard Tuning")).toBeVisible();
    await expect(page.locator("text=Excellent tuning!")).toBeVisible();
    await expect(page.locator("text=Book Now")).toBeVisible();
  });
});
