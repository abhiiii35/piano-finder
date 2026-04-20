import { test, expect } from "@playwright/test";

test.describe("Email Verification", () => {
  test("visit /verify-email with no params shows Invalid or Expired Link", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.locator("h1")).toContainText("Invalid or Expired Link");
  });

  test("visit /verify-email with invalid token shows Invalid or Expired Link", async ({ page }) => {
    await page.goto("/verify-email?token=invalid&email=bad@test.com");
    await expect(page.locator("h1")).toContainText("Invalid or Expired Link");
  });

  test("verify-email page has sign-in link", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.locator("a", { hasText: "Sign In" })).toBeVisible();
  });
});
