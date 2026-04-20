import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Rebook", () => {
  test("customer dashboard shows Past Bookings section", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/dashboard/customer");
    await expect(page.locator("text=Past Bookings")).toBeVisible();
  });

  test("past bookings show Rebook button", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/dashboard/customer");
    await expect(page.locator("a", { hasText: "Rebook" }).first()).toBeVisible();
  });

  test("clicking Rebook navigates to technician booking page", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/dashboard/customer");
    await page.locator("a", { hasText: "Rebook" }).first().click();
    await expect(page).toHaveURL(/\/technicians\/test-tech-profile\/book/);
  });
});
