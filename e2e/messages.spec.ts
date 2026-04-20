import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Messages", () => {
  test("technician profile shows Send a Message button", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("button", { hasText: "Send a Message" })).toBeVisible();
  });

  test("unauthenticated user clicking message button redirects to sign-in", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await page.locator("button", { hasText: "Send a Message" }).click();
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
  });

  test("technician booking detail page has message thread section", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/bookings/test-booking-completed");
    await expect(page.locator("text=Messages")).toBeVisible();
  });
});
