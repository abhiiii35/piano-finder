import { type Page } from "@playwright/test";

/**
 * Sign in with email/password via the sign-in form.
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Sign up a new user and get redirected to dashboard.
 */
export async function signUp(page: Page, email: string, password: string) {
  await page.goto("/sign-up");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}
