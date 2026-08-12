import { test, expect } from "@playwright/test";

test.describe("password reset flow", () => {
  test("forgot-password gives a neutral response for any email", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("you@example.com").fill("tech@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/if an account exists/i)).toBeVisible();

    // Unknown email: identical response — no account enumeration
    await page.goto("/forgot-password");
    await page.getByPlaceholder("you@example.com").fill("nobody@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/if an account exists/i)).toBeVisible();
  });

  test("invalid reset token shows the expired-link message", async ({ page }) => {
    await page.goto("/reset-password/not-a-real-token");
    await page.getByPlaceholder("New password (8+ characters)").fill("newpassword1");
    await page.getByPlaceholder("Repeat new password").fill("newpassword1");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText(/this link has expired/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /request a new link/i })).toBeVisible();
  });

  test("sign-in page links to forgot-password", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
