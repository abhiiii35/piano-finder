import { describe, it, expect } from "vitest";
import {
  buildBookingConfirmationEmail,
  buildPostTuningEmail,
} from "@/lib/email-templates";

describe("email-templates", () => {
  describe("buildBookingConfirmationEmail", () => {
    it("renders booking confirmation with all details", () => {
      const html = buildBookingConfirmationEmail({
        customerName: "Alice Smith",
        technicianName: "Bob Johnson",
        technicianPhone: "555-1234",
        scheduledAt: new Date("2026-07-20T14:00:00"),
        durationMin: 90,
        address: "123 Piano St, Boston, MA 02101",
        pianoType: "Upright",
        notes: "Please call before arriving",
        bookingId: "booking-123",
      });

      expect(html).toContain("Alice Smith");
      expect(html).toContain("Bob Johnson");
      expect(html).toContain("555-1234");
      expect(html).toContain("90 minutes");
      expect(html).toContain("123 Piano St");
      expect(html).toContain("Upright");
      expect(html).toContain("Please call before arriving");
      expect(html).toContain("How to prepare");
    });

    it("handles missing optional fields", () => {
      const html = buildBookingConfirmationEmail({
        customerName: "Alice Smith",
        technicianName: "Bob Johnson",
        scheduledAt: new Date("2026-07-20T14:00:00"),
        durationMin: 60,
        address: "123 Piano St, Boston, MA 02101",
        bookingId: "booking-123",
      });

      expect(html).toContain("Alice Smith");
      expect(html).toContain("How to prepare");
      // Should not include optional sections
      expect(html).not.toContain("Piano type:");
      expect(html).not.toContain("Special notes");
    });

    it("formats date and time correctly", () => {
      const testDate = new Date("2026-12-25T10:30:00");
      const html = buildBookingConfirmationEmail({
        customerName: "Test",
        technicianName: "Tech",
        scheduledAt: testDate,
        durationMin: 60,
        address: "Test Address",
        bookingId: "test-123",
      });

      expect(html).toContain("December 25");
      expect(html).toContain("2026");
      // Check for time formatting (10:30 AM)
      expect(html).toMatch(/10:?30/);
    });
  });

  describe("buildPostTuningEmail", () => {
    it("renders post-tuning email with care tips", () => {
      const html = buildPostTuningEmail({
        customerName: "Alice Smith",
        technicianName: "Bob Johnson",
        nextTuneDueDate: "July 20, 2027",
        nextTuneDueMonth: "July",
        bookingId: "booking-123",
      });

      expect(html).toContain("Alice Smith");
      expect(html).toContain("Bob Johnson");
      expect(html).toContain("July 20, 2027");
      expect(html).toContain("Humidity is key");
      expect(html).toContain("40–60%");
      expect(html).toContain("Keep the lid closed");
      expect(html).toContain("When to tune again");
    });

    it("includes specific humidity and care guidance", () => {
      const html = buildPostTuningEmail({
        customerName: "Test",
        technicianName: "Tech",
        nextTuneDueDate: "Jan 1, 2027",
        nextTuneDueMonth: "January",
        bookingId: "test-123",
      });

      expect(html).toContain("40–60%");
      expect(html).toContain("humidifier");
      expect(html).toContain("direct sunlight");
      expect(html).toContain("pitch raise");
    });
  });
});
