import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Mobile Bottom Navigation", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("bottom nav is visible on mobile search page", async ({ page }) => {
    await page.goto("/search");
    // BottomNav is included in the (public) layout (search, jobs, technicians)
    const nav = page.locator("nav").filter({ has: page.locator("text=Home") });
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test("bottom nav shows Home, Search, Jobs, Sign In tabs", async ({ page }) => {
    await page.goto("/search");
    const nav = page.locator("nav").filter({ has: page.locator("text=Home") });
    await expect(nav.locator("text=Home")).toBeVisible({ timeout: 10000 });
    await expect(nav.locator("text=Search")).toBeVisible();
    await expect(nav.locator("text=Jobs")).toBeVisible();
    await expect(nav.locator("text=Sign In")).toBeVisible();
  });

  test("clicking Jobs tab navigates to /jobs", async ({ page }) => {
    await page.goto("/search");
    const nav = page.locator("nav").filter({ has: page.locator("text=Home") });
    // Use force:true to bypass Next.js dev overlay portal that can intercept clicks
    await nav.locator("a", { hasText: "Jobs" }).click({ force: true, timeout: 10000 });
    await expect(page).toHaveURL("/jobs");
  });

  test("signed-in user sees Dashboard tab instead of Sign In", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/search");
    const nav = page.locator("nav").filter({ has: page.locator("text=Home") });
    await expect(nav.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
    await expect(nav.locator("text=Sign In")).not.toBeVisible();
  });

  test("bottom nav is hidden during booking flow", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile/book");
    // BottomNav returns null on booking pages
    const nav = page.locator("nav").filter({ has: page.locator("text=Jobs") });
    await expect(nav).not.toBeVisible();
  });
});
