import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Stripe Integration", () => {
  test("booking page loads for authenticated user", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/technicians/test-tech-profile/book");

    // Should show the booking form
    await expect(page.locator("text=Select Services")).toBeVisible();
    await expect(page.locator("text=Standard Tuning")).toBeVisible();
  });

  test("confirm step shows correct booking button", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/technicians/test-tech-profile/book");

    // Step 1: Select a service
    await page.locator("label", { hasText: "Standard Tuning" }).click();
    await page.locator("button", { hasText: "Next" }).click();

    // Step 2: Pick a date — use a Wednesday to avoid timezone edge cases
    await expect(page.locator("text=Pick a Date")).toBeVisible();
    await page.locator("input#date").fill("2026-06-03"); // Wednesday
    // Wait for slots to appear
    const slotButton = page.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
    await slotButton.waitFor({ state: "visible", timeout: 10000 });
    await slotButton.click();
    await page.locator("button", { hasText: "Next" }).click();

    // Step 3: Fill address info
    await expect(page.locator("text=Your Details")).toBeVisible();
    await page.locator("input#addressLine1").fill("123 Test St");
    await page.locator("input#city").fill("Boston");
    await page.locator("input#state").fill("MA");
    await page.locator("input#zipCode").fill("02108");
    await page.locator("button", { hasText: "Review" }).click();

    // Step 4: Confirm heading and booking button visible
    await expect(page.locator("h3", { hasText: "Services" })).toBeVisible();
    await expect(page.locator("text=What to Expect")).toBeVisible();
    // The button says "Confirm Booking" (Stripe configured) or "Book & Pay Later" (no Stripe)
    const confirmBtn = page.getByRole("button", { name: /Confirm Booking|Book & Pay Later/ });
    await expect(confirmBtn).toBeVisible();
  });
});
