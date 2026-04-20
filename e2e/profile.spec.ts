import { test, expect } from "@playwright/test";

test.describe("Technician Profile Page", () => {
  test("shows technician name and business name", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("h1")).toContainText("Test Piano Service");
    await expect(page.locator("text=Test Technician")).toBeVisible();
  });

  test("shows services with prices", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("text=Services")).toBeVisible();
    await expect(page.locator("text=Standard Tuning")).toBeVisible();
    await expect(page.locator("text=Repair")).toBeVisible();
  });

  test("shows booking calendar section", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("text=Book an Appointment")).toBeVisible();
  });

  test("shows service area section", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("text=Service Area")).toBeVisible();
    await expect(page.locator("text=Boston, MA").first()).toBeVisible();
  });

  test("shows reviews section", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("text=Reviews")).toBeVisible();
    await expect(page.locator("text=Excellent tuning!")).toBeVisible();
  });

  test("shows certifications", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("text=Certifications")).toBeVisible();
    await expect(page.locator("text=RPT")).toBeVisible();
  });

  test("shows Book Now button", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await expect(page.locator("text=Book Now")).toBeVisible();
  });

  test("Book Now link navigates to booking page", async ({ page }) => {
    await page.goto("/technicians/test-tech-profile");
    await page.locator("a", { hasText: "Book Now" }).click();
    await expect(page).toHaveURL(/\/technicians\/test-tech-profile\/book/);
  });
});
