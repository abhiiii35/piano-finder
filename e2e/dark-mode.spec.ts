import { test, expect } from "@playwright/test";

test.describe("Dark Mode Toggle", () => {
  test("theme toggle button is visible in header", async ({ page }) => {
    await page.goto("/");
    // The toggle has an aria-label like "Switch to dark mode" or "Switch to light mode"
    await expect(page.locator("button[aria-label*='Switch to']")).toBeVisible();
  });

  test("clicking theme toggle adds dark class to html", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("button[aria-label*='Switch to']");
    await toggle.click();

    // One of these should be true: either dark class was added or removed
    const htmlClass = await page.locator("html").getAttribute("class");
    // After clicking, check for dark class
    if (htmlClass?.includes("dark")) {
      // Dark mode was enabled
      await expect(page.locator("html")).toHaveClass(/dark/);
      // Click again to disable
      await toggle.click();
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    } else {
      // Dark mode was disabled (was already dark, now light)
      await expect(page.locator("html")).not.toHaveClass(/dark/);
      // Click again to re-enable
      await toggle.click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
  });
});
