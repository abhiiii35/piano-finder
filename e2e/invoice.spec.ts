import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Invoice", () => {
  test("booking detail page has View Invoice link", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-completed");
    await expect(page.locator("a", { hasText: "View Invoice" })).toBeVisible();
  });

  test("View Invoice link points to correct URL", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-completed");
    const link = page.locator("a", { hasText: "View Invoice" });
    await expect(link).toHaveAttribute(
      "href",
      "/dashboard/technician/bookings/test-booking-completed/invoice"
    );
  });

  test("booking detail shows service line items and total", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-completed");
    await expect(page.locator("text=Standard Tuning")).toBeVisible();
    await expect(page.locator("text=Total")).toBeVisible();
  });

  test("booking detail shows payment status", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-completed");
    await expect(page.locator("text=SUCCEEDED")).toBeVisible();
  });
});
