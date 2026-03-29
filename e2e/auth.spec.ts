import { test, expect } from "@playwright/test";
import { signIn, signUp } from "./helpers";

test.describe("Authentication", () => {
  test("sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("h1")).toContainText("Welcome to PianoTune");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("sign-up page renders", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("h1")).toContainText("Create your account");
  });

  test("sign in with valid credentials", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("sign in with invalid credentials shows error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.locator('input[name="email"]').fill("wrong@test.com");
    await page.locator('input[name="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });

  test("sign up creates a new account", async ({ page }) => {
    const email = `newuser-${Date.now()}@test.com`;
    await signUp(page, email, "password123");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard/customer");
    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
