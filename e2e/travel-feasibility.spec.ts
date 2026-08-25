import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * The seeded technician (Boston, travelBufferMin 30) has a CONFIRMED booking
 * in Worcester on Monday 2026-08-03, 11:00-12:00. Worcester is ~78 driving
 * minutes from Boston at the assumed average speed, so for a Boston customer
 * booking a 90-min tuning that day:
 *  - every slot before the Worcester job is infeasible (can't reach Worcester)
 *  - afternoon slots are feasible only from ~14:00 (drive back + buffer)
 *  - late slots are cut by the home-base end-of-day anchor
 * Slots come from the server action, so absence here means absence from the
 * server response.
 */
test.describe("Travel feasibility filtering", () => {
  test("customer sees only travel-feasible slots and can book one", async ({ page }) => {
    test.setTimeout(60000); // live (free) Nominatim geocoding adds latency

    await signIn(page, "customer@test.com", "password123");
    await page.goto("/technicians/test-tech-profile/book");

    // Step 1: service (90 min tuning)
    await page.locator("label", { hasText: "Standard Tuning" }).click();
    await page.locator("button", { hasText: "Next" }).click();

    // Step 2: address comes before time selection
    await expect(page.locator("text=Your Details")).toBeVisible();
    await page.locator("input#addressLine1").fill("10 Beacon St");
    await page.locator("input#city").fill("Boston");
    await page.locator("input#state").fill("MA");
    await page.locator("input#zipCode").fill("02108");
    await page.locator("button", { hasText: "Next" }).click();

    // Step 3: pick the day with the Worcester appointment
    await expect(page.locator("text=Pick a Date")).toBeVisible();
    await page.locator("input#date").fill("2026-08-03"); // Monday

    // Wait for the (geocoded + filtered) slot list
    const feasibleSlot = page.getByRole("button", { name: "14:00", exact: true });
    await expect(feasibleSlot).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: "14:30", exact: true })).toBeVisible();

    // Infeasible neighbors of the Worcester booking are not rendered at all
    for (const infeasible of ["09:00", "09:30", "12:00", "12:30", "13:00", "13:30", "15:30"]) {
      await expect(page.getByRole("button", { name: infeasible, exact: true })).toHaveCount(0);
    }

    // Book the feasible slot end-to-end (also exercises the server-side
    // feasibility check and booking geocoding in createBooking)
    await feasibleSlot.click();
    await page.locator("button", { hasText: "Review" }).click();
    await expect(page.locator("text=What to Expect")).toBeVisible();
    await page.getByRole("button", { name: /Confirm Booking|Book & Pay Later/ }).click();
    await page.waitForURL(/\/dashboard\/customer\/bookings\//, { timeout: 30000 });
  });
});
