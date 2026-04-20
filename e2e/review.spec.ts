import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Reviews", () => {
  test("completed booking without review shows Leave a Review button", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/dashboard/customer/bookings/test-booking-no-review");
    await expect(page.locator("text=Leave a Review")).toBeVisible();
  });

  test("review page renders with rating input and comment field", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/dashboard/customer/bookings/test-booking-no-review/review");
    await expect(page.locator("h1")).toContainText("Leave a Review");
    await expect(page.locator("text=Your Review")).toBeVisible();
    await expect(page.getByText("Rating", { exact: true })).toBeVisible();
    await expect(page.locator("textarea#comment")).toBeVisible();
  });

  test("completed booking with existing review does not show Leave a Review button", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/dashboard/customer/bookings/test-booking-completed");
    await expect(page.locator("text=Leave a Review")).not.toBeVisible();
  });
});
