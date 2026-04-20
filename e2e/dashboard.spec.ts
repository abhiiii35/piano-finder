import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Customer Dashboard", () => {
  test("shows dashboard with welcome message", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("can navigate to bookings", async ({ page }) => {
    await signIn(page, "customer@test.com", "password123");
    await page.goto("/dashboard/customer/bookings");
    await expect(page.locator("h1")).toContainText("My Bookings");
  });
});

test.describe("Technician Dashboard", () => {
  test("shows dashboard with stat cards", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator("text=appointments")).toBeVisible();
    await expect(page.locator("text=to confirm")).toBeVisible();
    await expect(page.locator("text=total earned")).toBeVisible();
    await expect(page.locator("text=reviews")).toBeVisible();
  });

  test("tabs navigate correctly", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    // Click customers tab
    await page.locator("a", { hasText: "Customers" }).click();
    await expect(page).toHaveURL(/tab=customers/);
  });

  test("can access profile page", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.locator("text=View Profile").click();
    await page.waitForURL(/\/dashboard\/technician\/profile/, { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("Edit Profile");
  });

  test("can access services page", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await page.goto("/dashboard/technician/services");
    await expect(page.locator("h1")).toContainText("Services");
    await expect(page.locator("text=Standard Tuning")).toBeVisible();
  });

  test("shows calendar with view toggle", async ({ page }) => {
    await signIn(page, "tech@test.com", "password123");
    await expect(page.getByRole("button", { name: "Day", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Week", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Month", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Today", exact: true })).toBeVisible();
  });
});
