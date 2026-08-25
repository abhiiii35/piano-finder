import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  fixtures,
  mockTechnicianSession,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, bodyHtml: string) => `<html>${heading}${bodyHtml}</html>`),
}));

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import {
  getDueReminders,
  sendTuneReminder,
  sendAllDueReminders,
  generateRemindersForBooking,
  getOverdueReminderCount,
  sendReminderNow,
  dismissReminder,
  updateReminderMode,
  saveMessageTemplate,
} from "@/actions/reminders";

const mockSendEmail = vi.mocked(sendEmail);
const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

function techWithMode(mode: string) {
  return { ...fixtures.technicianProfile, reminderMode: mode, user: { id: "tech-user-1", name: "Mike Tuner", email: "tech@example.com" } };
}

describe("reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDueReminders", () => {
    it("returns reminders with dueDate on or before today and not sent", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const dueReminder = {
        ...fixtures.tuneReminder,
        dueDate: yesterday,
        technician: techWithMode("AUTO"),
        customerRecord: fixtures.customerRecord,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findMany.mockResolvedValue([dueReminder] as any);

      const result = await getDueReminders(100);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("reminder-1");
      expect(prismaMock.tuneReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: {
              lte: expect.any(Date),
            },
            sent: false,
          },
        }),
      );
    });

    it("filters out reminders that are already sent", async () => {
      prismaMock.tuneReminder.findMany.mockResolvedValue([]);

      const result = await getDueReminders(100);

      expect(result).toHaveLength(0);
    });

    it("respects the limit parameter", async () => {
      prismaMock.tuneReminder.findMany.mockResolvedValue([]);

      await getDueReminders(50);

      expect(prismaMock.tuneReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });
  });

  describe("sendTuneReminder", () => {
    it("sends the default recall email and marks reminder as sent when no template is set", async () => {
      const reminderId = "reminder-1";
      const reminderData = {
        ...fixtures.tuneReminder,
        id: reminderId,
        customerRecord: fixtures.customerRecord,
        technician: techWithMode("REVIEW"),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminderData as any);
      prismaMock.messageTemplate.findUnique.mockResolvedValue(null);
      prismaMock.tuneReminder.update.mockResolvedValue({
        ...reminderData,
        sent: true,
        sentAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      mockSendEmail.mockResolvedValue(undefined);

      const result = await sendTuneReminder(reminderId, "http://example.com/book");

      expect(result.success).toBe(true);
      expect(result.email).toBe("jane@example.com");
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "jane@example.com",
          subject: "Time to schedule your next piano tuning",
        }),
      );
      expect(prismaMock.tuneReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: reminderId },
          data: {
            sent: true,
            sentAt: expect.any(Date),
          },
        }),
      );
    });

    it("renders the technician's saved RECALL template when one exists", async () => {
      const reminderData = {
        ...fixtures.tuneReminder,
        customerRecord: fixtures.customerRecord,
        technician: techWithMode("AUTO"),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminderData as any);
      prismaMock.messageTemplate.findUnique.mockResolvedValue({
        ...fixtures.messageTemplate,
        subject: "Custom subject for {customerName}",
        body: "Custom body for {pianoMake}",
      });
      prismaMock.tuneReminder.update.mockResolvedValue({ ...reminderData, sent: true } as never);
      mockSendEmail.mockResolvedValue(undefined);

      await sendTuneReminder("reminder-1", "http://example.com/book");

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "Custom subject for Jane Doe" }),
      );
    });

    it("returns error if reminder not found", async () => {
      prismaMock.tuneReminder.findUnique.mockResolvedValue(null);

      const result = await sendTuneReminder("nonexistent", "http://example.com/book");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reminder not found");
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns error if reminder already sent (idempotency)", async () => {
      const reminderData = {
        ...fixtures.tuneReminder,
        sent: true,
        sentAt: new Date(),
        customerRecord: fixtures.customerRecord,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminderData as any);

      const result = await sendTuneReminder("reminder-1", "http://example.com/book");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reminder already sent");
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns error if no customer email", async () => {
      const reminderData = {
        ...fixtures.tuneReminder,
        customerEmail: null,
        customerRecord: {
          ...fixtures.customerRecord,
          customerEmail: null,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminderData as any);

      const result = await sendTuneReminder("reminder-1", "http://example.com/book");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No customer email found");
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("handles email send errors gracefully", async () => {
      const reminderData = {
        ...fixtures.tuneReminder,
        customerRecord: fixtures.customerRecord,
        technician: techWithMode("AUTO"),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminderData as any);
      prismaMock.messageTemplate.findUnique.mockResolvedValue(null);
      mockSendEmail.mockRejectedValue(new Error("Email service down"));

      const result = await sendTuneReminder("reminder-1", "http://example.com/book");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Email service down");
    });
  });

  describe("sendAllDueReminders", () => {
    it("sends and marks reminders for AUTO-mode technicians", async () => {
      const reminder1 = {
        ...fixtures.tuneReminder,
        technician: techWithMode("AUTO"),
        customerRecord: fixtures.customerRecord,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findMany.mockResolvedValue([reminder1] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminder1 as any);
      prismaMock.messageTemplate.findUnique.mockResolvedValue(null);
      prismaMock.tuneReminder.update.mockResolvedValue({
        ...reminder1,
        sent: true,
        sentAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      mockSendEmail.mockResolvedValue(undefined);

      const results = await sendAllDueReminders(100);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(prismaMock.tuneReminder.update).toHaveBeenCalled();
    });

    it("skips REVIEW-mode technicians and leaves the reminder unsent", async () => {
      const reminder1 = {
        ...fixtures.tuneReminder,
        technician: techWithMode("REVIEW"),
        customerRecord: fixtures.customerRecord,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.tuneReminder.findMany.mockResolvedValue([reminder1] as any);

      const results = await sendAllDueReminders(100);

      expect(results).toHaveLength(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(prismaMock.tuneReminder.update).not.toHaveBeenCalled();
    });

    it("returns empty array when no due reminders", async () => {
      prismaMock.tuneReminder.findMany.mockResolvedValue([]);

      const results = await sendAllDueReminders(100);

      expect(results).toHaveLength(0);
    });
  });

  describe("generateRemindersForBooking", () => {
    const scheduledAt = new Date(2026, 3, 15, 10, 0); // Apr 15, 2026

    function bookingWithCustomer(overrides: Record<string, unknown> = {}) {
      return {
        ...fixtures.booking,
        scheduledAt,
        customer: { email: "jane@example.com" },
        ...overrides,
      };
    }

    it("does nothing when the booking has no customer email", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({ ...fixtures.booking, customer: { email: null } } as never);

      await generateRemindersForBooking("booking-1");

      expect(prismaMock.customerRecord.findUnique).not.toHaveBeenCalled();
    });

    it("does nothing when no CustomerRecord exists yet", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(bookingWithCustomer() as never);
      prismaMock.customerRecord.findUnique.mockResolvedValue(null);

      await generateRemindersForBooking("booking-1");

      expect(prismaMock.piano.findMany).not.toHaveBeenCalled();
    });

    it("defaults to 6-month frequency and creates both reminder types when no piano is on file", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(bookingWithCustomer() as never);
      prismaMock.customerRecord.findUnique.mockResolvedValue(fixtures.customerRecord);
      prismaMock.piano.findMany.mockResolvedValue([]);
      prismaMock.tuneReminder.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.tuneReminder.upsert.mockResolvedValue(fixtures.tuneReminder);

      await generateRemindersForBooking("booking-1");

      expect(prismaMock.tuneReminder.deleteMany).toHaveBeenCalledWith({
        where: { customerRecordId: "record-1", sent: false },
      });
      expect(prismaMock.tuneReminder.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.tuneReminder.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { customerRecordId_reminderType: { customerRecordId: "record-1", reminderType: "6_MONTH" } },
          update: {},
          create: expect.objectContaining({ reminderType: "6_MONTH", dueDate: new Date(2026, 9, 15, 10, 0) }),
        }),
      );
      expect(prismaMock.tuneReminder.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { customerRecordId_reminderType: { customerRecordId: "record-1", reminderType: "12_MONTH" } },
          create: expect.objectContaining({ reminderType: "12_MONTH", dueDate: new Date(2027, 3, 15, 10, 0) }),
        }),
      );
    });

    it("uses the single piano's tuningFrequencyMonths when exactly one piano exists", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(bookingWithCustomer() as never);
      prismaMock.customerRecord.findUnique.mockResolvedValue(fixtures.customerRecord);
      prismaMock.piano.findMany.mockResolvedValue([{ ...fixtures.piano, tuningFrequencyMonths: 12 }]);
      prismaMock.tuneReminder.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.tuneReminder.upsert.mockResolvedValue(fixtures.tuneReminder);

      await generateRemindersForBooking("booking-1");

      expect(prismaMock.tuneReminder.upsert).toHaveBeenCalledTimes(1);
      expect(prismaMock.tuneReminder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerRecordId_reminderType: { customerRecordId: "record-1", reminderType: "12_MONTH" } },
          create: expect.objectContaining({ reminderType: "12_MONTH", dueDate: new Date(2027, 3, 15, 10, 0) }),
        }),
      );
    });

    it("falls back to the default frequency when multiple pianos exist", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(bookingWithCustomer() as never);
      prismaMock.customerRecord.findUnique.mockResolvedValue(fixtures.customerRecord);
      prismaMock.piano.findMany.mockResolvedValue([fixtures.piano, { ...fixtures.piano, id: "piano-2" }]);
      prismaMock.tuneReminder.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.tuneReminder.upsert.mockResolvedValue(fixtures.tuneReminder);

      await generateRemindersForBooking("booking-1");

      expect(prismaMock.tuneReminder.upsert).toHaveBeenCalledTimes(2);
    });

    it("replaces unsent reminders but preserves a sent one via a no-op update", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(bookingWithCustomer() as never);
      prismaMock.customerRecord.findUnique.mockResolvedValue(fixtures.customerRecord);
      prismaMock.piano.findMany.mockResolvedValue([]);
      prismaMock.tuneReminder.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.tuneReminder.upsert.mockResolvedValue(fixtures.tuneReminder);

      await generateRemindersForBooking("booking-1");

      for (const call of prismaMock.tuneReminder.upsert.mock.calls) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((call[0] as any).update).toEqual({});
      }
    });

    it("handles the Aug 31 + 6 month boundary by clamping to the last day of February", async () => {
      const augScheduled = new Date(2026, 7, 31, 9, 0); // Aug 31, 2026
      prismaMock.booking.findUnique.mockResolvedValue(bookingWithCustomer({ scheduledAt: augScheduled }) as never);
      prismaMock.customerRecord.findUnique.mockResolvedValue(fixtures.customerRecord);
      prismaMock.piano.findMany.mockResolvedValue([]);
      prismaMock.tuneReminder.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.tuneReminder.upsert.mockResolvedValue(fixtures.tuneReminder);

      await generateRemindersForBooking("booking-1");

      expect(prismaMock.tuneReminder.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          create: expect.objectContaining({ dueDate: new Date(2027, 1, 28, 9, 0) }),
        }),
      );
    });
  });

  describe("getOverdueReminderCount", () => {
    it("counts unsent reminders due on or before now", async () => {
      prismaMock.tuneReminder.count.mockResolvedValue(3);

      const count = await getOverdueReminderCount("tech-profile-1");

      expect(count).toBe(3);
      expect(prismaMock.tuneReminder.count).toHaveBeenCalledWith({
        where: { technicianId: "tech-profile-1", sent: false, dueDate: { lte: expect.any(Date) } },
      });
    });
  });

  describe("sendReminderNow", () => {
    it("sends and marks the reminder when it belongs to the caller", async () => {
      setupTechSession();
      const owned = { ...fixtures.tuneReminder, technicianId: "tech-profile-1" };
      prismaMock.tuneReminder.findUnique
        .mockResolvedValueOnce(owned as never)
        .mockResolvedValueOnce({
          ...owned,
          customerRecord: fixtures.customerRecord,
          technician: techWithMode("REVIEW"),
        } as never);
      prismaMock.messageTemplate.findUnique.mockResolvedValue(null);
      prismaMock.tuneReminder.update.mockResolvedValue({ ...owned, sent: true } as never);
      mockSendEmail.mockResolvedValue(undefined);

      const result = await sendReminderNow("reminder-1");

      expect(result.success).toBe(true);
      expect(prismaMock.tuneReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { sent: true, sentAt: expect.any(Date) } }),
      );
    });

    it("rejects a reminder belonging to a different technician", async () => {
      setupTechSession();
      prismaMock.tuneReminder.findUnique.mockResolvedValue({
        ...fixtures.tuneReminder,
        technicianId: "someone-elses-profile",
      } as never);

      const result = await sendReminderNow("reminder-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reminder not found");
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("dismissReminder", () => {
    it("marks an unsent reminder handled without emailing", async () => {
      setupTechSession();
      prismaMock.tuneReminder.findUnique.mockResolvedValue({
        ...fixtures.tuneReminder,
        technicianId: "tech-profile-1",
      } as never);
      prismaMock.tuneReminder.update.mockResolvedValue({ ...fixtures.tuneReminder, sent: true } as never);

      const result = await dismissReminder("reminder-1");

      expect(result.success).toBe(true);
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(prismaMock.tuneReminder.update).toHaveBeenCalledWith({
        where: { id: "reminder-1" },
        data: { sent: true, sentAt: expect.any(Date) },
      });
    });

    it("rejects an already-sent reminder", async () => {
      setupTechSession();
      prismaMock.tuneReminder.findUnique.mockResolvedValue({
        ...fixtures.tuneReminder,
        technicianId: "tech-profile-1",
        sent: true,
      } as never);

      const result = await dismissReminder("reminder-1");

      expect(result.error).toBe("Already handled");
      expect(prismaMock.tuneReminder.update).not.toHaveBeenCalled();
    });
  });

  describe("updateReminderMode", () => {
    it("updates the technician's reminder mode", async () => {
      setupTechSession();
      prismaMock.technicianProfile.update.mockResolvedValue({ ...fixtures.technicianProfile, reminderMode: "AUTO" });

      const result = await updateReminderMode("AUTO");

      expect(result.success).toBe(true);
      expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
        where: { id: "tech-profile-1" },
        data: { reminderMode: "AUTO" },
      });
    });

    it("rejects an invalid mode", async () => {
      const result = await updateReminderMode("MAYBE");
      expect(result.error).toBe("Invalid reminder mode");
    });
  });

  describe("saveMessageTemplate", () => {
    it("saves a valid RECALL template", async () => {
      setupTechSession();
      prismaMock.messageTemplate.upsert.mockResolvedValue(fixtures.messageTemplate);

      const fd = makeFormData({ type: "RECALL", subject: "Hi {customerName}", body: "Time to tune {pianoMake}." });
      const result = await saveMessageTemplate(fd);

      expect(result.success).toBe(true);
      expect(prismaMock.messageTemplate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { technicianId_type: { technicianId: "tech-profile-1", type: "RECALL" } },
          create: expect.objectContaining({ sendOffsetHours: null }),
        }),
      );
    });

    it("defaults sendOffsetHours to 24 for APPT_REMINDER when omitted", async () => {
      setupTechSession();
      prismaMock.messageTemplate.upsert.mockResolvedValue(fixtures.messageTemplate);

      const fd = makeFormData({ type: "APPT_REMINDER", subject: "Reminder", body: "See you at {bookingTime}." });
      await saveMessageTemplate(fd);

      expect(prismaMock.messageTemplate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ sendOffsetHours: 24 }) }),
      );
    });

    it("rejects a subject over 120 characters", async () => {
      setupTechSession();
      const fd = makeFormData({ type: "RECALL", subject: "x".repeat(121), body: "body" });

      const result = await saveMessageTemplate(fd);

      expect(result.error).toBeTruthy();
      expect(prismaMock.messageTemplate.upsert).not.toHaveBeenCalled();
    });

    it("rejects sendOffsetHours outside 1-168", async () => {
      setupTechSession();
      const fd = makeFormData({ type: "APPT_REMINDER", subject: "s", body: "b", sendOffsetHours: "200" });

      const result = await saveMessageTemplate(fd);

      expect(result.error).toBeTruthy();
      expect(prismaMock.messageTemplate.upsert).not.toHaveBeenCalled();
    });
  });
});
