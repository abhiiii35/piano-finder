import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Booking Flow", () => {
  test("booking page requires authentication", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile/book");
    await expect(page.locator("text=Please sign in")).toBeVisible();
  });

  test("booking page shows services for selection", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/technicians/test-tech-profile/book");
    // Step 1: select services
    await expect(page.locator("text=Select Services")).toBeVisible();
    await expect(page.locator("text=Standard Tuning")).toBeVisible();
    await expect(page.locator("text=Repair")).toBeVisible();
  });

  test("can navigate through booking steps", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/technicians/test-tech-profile/book");

    // Step 1: Select a service
    await page.locator("label", { hasText: "Standard Tuning" }).click();
    await page.locator("button", { hasText: "Next" }).click();

    // Step 2: Address comes before date & time so slots can be travel-filtered
    await expect(page.locator("text=Your Details")).toBeVisible();
  });
});
