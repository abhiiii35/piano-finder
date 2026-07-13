import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendBookingConfirmationEmail,
  sendPostTuningEmail,
  sendTuneDueReminderEmail,
} from "@/actions/lifecycle-email";
import * as emailModule from "@/lib/email";

// Mock the email module
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: (heading: string, body: string) =>
    `<h1>${heading}</h1>${body}`,
}));

describe("lifecycle-email actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendBookingConfirmationEmail", () => {
    it("sends booking confirmation email with correct data", async () => {
      const sendEmailSpy = vi.spyOn(emailModule, "sendEmail");

      await sendBookingConfirmationEmail("customer@example.com", {
        customerName: "Alice",
        technicianName: "Bob",
        technicianPhone: "555-1234",
        scheduledAt: new Date("2026-07-20T14:00:00"),
        durationMin: 90,
        address: "123 Piano St",
        pianoType: "Upright",
        bookingId: "booking-123",
      });

      expect(sendEmailSpy).toHaveBeenCalledOnce();
      const call = sendEmailSpy.mock.calls[0][0];
      expect(call.to).toBe("customer@example.com");
      expect(call.subject).toContain("piano tuning appointment");
      expect(call.html).toContain("Alice");
      expect(call.html).toContain("Bob");
    });

    it("formats date in subject line", async () => {
      const sendEmailSpy = vi.spyOn(emailModule, "sendEmail");

      await sendBookingConfirmationEmail("test@example.com", {
        customerName: "Test",
        technicianName: "Tech",
        scheduledAt: new Date("2026-07-20T14:00:00"),
        durationMin: 60,
        address: "Test Address",
        bookingId: "test-123",
      });

      const call = sendEmailSpy.mock.calls[0][0];
      expect(call.subject).toMatch(/Jul|July/);
      expect(call.subject).toMatch(/20/);
    });
  });

  describe("sendPostTuningEmail", () => {
    it("sends post-tuning email with care tips", async () => {
      const sendEmailSpy = vi.spyOn(emailModule, "sendEmail");

      await sendPostTuningEmail("customer@example.com", {
        customerName: "Alice",
        technicianName: "Bob",
        nextTuneDueDate: "July 20, 2027",
        nextTuneDueMonth: "July",
        bookingId: "booking-123",
      });

      expect(sendEmailSpy).toHaveBeenCalledOnce();
      const call = sendEmailSpy.mock.calls[0][0];
      expect(call.to).toBe("customer@example.com");
      expect(call.subject).toContain("Piano tuning complete");
      expect(call.html).toContain("Alice");
      expect(call.html.toLocaleLowerCase()).toContain("care tips");
    });

    it("includes next tuning reminder", async () => {
      const sendEmailSpy = vi.spyOn(emailModule, "sendEmail");

      await sendPostTuningEmail("test@example.com", {
        customerName: "Test",
        technicianName: "Tech",
        nextTuneDueDate: "Jan 1, 2027",
        nextTuneDueMonth: "January",
        bookingId: "test-123",
      });

      const call = sendEmailSpy.mock.calls[0][0];
      expect(call.html).toContain("January");
      expect(call.html).toContain("next tuning");
    });
  });

  describe("sendTuneDueReminderEmail", () => {
    it("sends 6-month reminder", async () => {
      const sendEmailSpy = vi.spyOn(emailModule, "sendEmail");

      await sendTuneDueReminderEmail("customer@example.com", {
        customerName: "Alice",
        monthsOverdue: 6,
        technicianName: "Bob",
      });

      expect(sendEmailSpy).toHaveBeenCalledOnce();
      const call = sendEmailSpy.mock.calls[0][0];
      expect(call.to).toBe("customer@example.com");
      expect(call.subject).toContain("piano tuning");
      expect(call.html).toContain("6 months");
    });

    it("sends overdue reminder for 12+ months", async () => {
      const sendEmailSpy = vi.spyOn(emailModule, "sendEmail");

      await sendTuneDueReminderEmail("test@example.com", {
        customerName: "Test",
        monthsOverdue: 14,
        technicianName: "Tech",
      });

      const call = sendEmailSpy.mock.calls[0][0];
      expect(call.subject).toContain("overdue");
      expect(call.html).toContain("14 months");
    });

    it("handles missing technician", async () => {
      const sendEmailSpy = vi.spyOn(emailModule, "sendEmail");

      await sendTuneDueReminderEmail("test@example.com", {
        customerName: "Test",
        monthsOverdue: 8,
      });

      expect(sendEmailSpy).toHaveBeenCalledOnce();
      const call = sendEmailSpy.mock.calls[0][0];
      expect(call.html).toContain("8 months");
    });
  });
});
