import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Job Board", () => {
  test("job board page renders with listings", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("h1")).toContainText("Job Board");
    await expect(page.locator("text=Annual piano tuning needed")).toBeVisible();
  });

  test("job detail page renders", async ({ page }) => {
    await page.goto("/jobs");
    await page.locator("text=Annual piano tuning needed").click();
    await expect(page).toHaveURL(/\/jobs\//);
    await expect(page.locator("text=Steinway Model B")).toBeVisible();
  });

  test("post a job page requires auth", async ({ page }) => {
    await page.goto("/jobs/post");
    await expect(page.locator("text=Please sign in")).toBeVisible();
  });

  test("logged-in customer can access post job form", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/jobs/post");
    await expect(page.locator("h1")).toContainText("Post a Job");
  });

  test("technician can see apply button on job detail", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/jobs/test-job");
    await expect(page.locator("text=Apply to this Job")).toBeVisible();
  });
});
