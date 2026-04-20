import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Booking Status Management", () => {
  test("technician sees Confirm and Cancel buttons on pending booking", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-pending");
    await expect(page.locator("h1")).toContainText("Booking Details");
    await expect(page.locator("text=PENDING")).toBeVisible();
    await expect(page.locator("button", { hasText: "Confirm" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Cancel" })).toBeVisible();
  });

  test("technician sees booking detail info", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-pending");
    // Customer info
    await expect(page.locator("text=Test Customer")).toBeVisible();
    // Services
    await expect(page.locator("text=Standard Tuning")).toBeVisible();
    // Address
    await expect(page.locator("text=456 Test Ave")).toBeVisible();
  });

  test("completed booking shows no status action buttons", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-completed");
    await expect(page.locator("h1")).toContainText("Booking Details");
    await expect(page.locator("text=COMPLETED")).toBeVisible();
    // No Confirm or Cancel buttons for completed bookings
    await expect(page.locator("button", { hasText: "Confirm" })).not.toBeVisible();
    await expect(page.locator("button", { hasText: "Cancel" })).not.toBeVisible();
  });
});
