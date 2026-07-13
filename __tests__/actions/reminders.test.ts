import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  fixtures,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, bodyHtml: string) => `<html>${heading}${bodyHtml}</html>`),
}));

import { sendEmail } from "@/lib/email";
import {
  getDueReminders,
  sendTuneReminder,
  sendAllDueReminders,
} from "@/actions/reminders";

const mockSendEmail = vi.mocked(sendEmail);

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
        technician: {
          ...fixtures.technicianProfile,
          user: { id: "tech-user-1", email: "tech@example.com" },
        },
        customerRecord: fixtures.customerRecord,
      };

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
    it("sends email and marks reminder as sent", async () => {
      const reminderId = "reminder-1";
      const reminderData = {
        ...fixtures.tuneReminder,
        id: reminderId,
        customerRecord: fixtures.customerRecord,
      };

      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminderData as any);
      prismaMock.tuneReminder.update.mockResolvedValue({
        ...reminderData,
        sent: true,
        sentAt: new Date(),
      } as any);
      mockSendEmail.mockResolvedValue(undefined);

      const result = await sendTuneReminder(reminderId, "http://example.com/book");

      expect(result.success).toBe(true);
      expect(result.email).toBe("jane@example.com");
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "jane@example.com",
          subject: expect.stringContaining("time to tune"),
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
      };

      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminderData as any);
      mockSendEmail.mockRejectedValue(new Error("Email service down"));

      const result = await sendTuneReminder("reminder-1", "http://example.com/book");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Email service down");
    });
  });

  describe("sendAllDueReminders", () => {
    it("processes multiple reminders", async () => {
      const reminder1 = {
        ...fixtures.tuneReminder,
        technician: {
          ...fixtures.technicianProfile,
          user: { id: "tech-user-1", email: "tech@example.com" },
        },
        customerRecord: fixtures.customerRecord,
      };

      prismaMock.tuneReminder.findMany.mockResolvedValue([reminder1] as any);
      prismaMock.tuneReminder.findUnique.mockResolvedValue(reminder1 as any);
      prismaMock.tuneReminder.update.mockResolvedValue({
        ...reminder1,
        sent: true,
        sentAt: new Date(),
      } as any);
      mockSendEmail.mockResolvedValue(undefined);

      const results = await sendAllDueReminders(100);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it("returns empty array when no due reminders", async () => {
      prismaMock.tuneReminder.findMany.mockResolvedValue([]);

      const results = await sendAllDueReminders(100);

      expect(results).toHaveLength(0);
    });
  });
});
