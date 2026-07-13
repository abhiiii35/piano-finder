"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { tuneReminderEmail } from "@/lib/emails/tuneReminder";

export type SendReminderResult = {
  success: boolean;
  reminderId: string;
  email: string;
  error?: string;
};

/**
 * Select tune reminders that are due and not yet sent.
 * A reminder is due when dueDate is on or before today and sent=false.
 */
export async function getDueReminders(limit: number = 100) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.tuneReminder.findMany({
    where: {
      dueDate: {
        lte: today,
      },
      sent: false,
    },
    include: {
      technician: {
        include: {
          user: true,
        },
      },
      customerRecord: true,
    },
    orderBy: {
      dueDate: "asc",
    },
    take: limit,
  });
}

/**
 * Send a single tune reminder email and mark it as sent.
 * Uses idempotency: only sends if not already sent.
 */
export async function sendTuneReminder(
  reminderId: string,
  bookingLink: string,
): Promise<SendReminderResult> {
  try {
    // Fetch the reminder with related data
    const reminder = await prisma.tuneReminder.findUnique({
      where: { id: reminderId },
      include: {
        customerRecord: true,
      },
    });

    if (!reminder) {
      return {
        success: false,
        reminderId,
        email: "",
        error: "Reminder not found",
      };
    }

    // Idempotency check: don't send if already sent
    if (reminder.sent) {
      return {
        success: false,
        reminderId,
        email: reminder.customerEmail,
        error: "Reminder already sent",
      };
    }

    if (!reminder.customerEmail) {
      return {
        success: false,
        reminderId,
        email: "",
        error: "No customer email found",
      };
    }

    // Build and send the email
    const emailContent = tuneReminderEmail(
      {
        customerName: reminder.customerRecord.customerName,
        pianoMake: reminder.customerRecord.pianoMake || undefined,
        pianoModel: reminder.customerRecord.pianoModel || undefined,
        lastTuningDate: reminder.lastTuningDate,
        reminderType: reminder.reminderType as "6_MONTH" | "12_MONTH",
      },
      bookingLink,
    );

    await sendEmail({
      to: reminder.customerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // Mark as sent atomically
    await prisma.tuneReminder.update({
      where: { id: reminderId },
      data: {
        sent: true,
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      reminderId,
      email: reminder.customerEmail,
    };
  } catch (error) {
    console.error(`[sendTuneReminder] Failed for reminder ${reminderId}:`, error);
    return {
      success: false,
      reminderId,
      email: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send all due tune reminders.
 * Returns results for each reminder processed.
 */
export async function sendAllDueReminders(limit: number = 100): Promise<SendReminderResult[]> {
  const reminders = await getDueReminders(limit);

  if (reminders.length === 0) {
    console.log("[sendAllDueReminders] No due reminders found");
    return [];
  }

  console.log(`[sendAllDueReminders] Processing ${reminders.length} reminders`);

  const results: SendReminderResult[] = [];

  for (const reminder of reminders) {
    // Build booking link using technician ID and customer record ID
    const bookingLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/search?technicianId=${reminder.technician.id}`;

    const result = await sendTuneReminder(reminder.id, bookingLink);
    results.push(result);

    if (result.success) {
      console.log(`[sendAllDueReminders] Sent reminder ${reminder.id} to ${result.email}`);
    } else {
      console.error(`[sendAllDueReminders] Failed to send reminder ${reminder.id}: ${result.error}`);
    }
  }

  return results;
}
