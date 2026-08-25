"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { addMonths } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { tuneReminderEmail } from "@/lib/emails/tuneReminder";

export type SendReminderResult = {
  success: boolean;
  reminderId: string;
  email: string;
  error?: string;
};

// ─── Population: generate reminders when a booking completes ───────────

const FALLBACK_FREQUENCY_MONTHS = 6;

/**
 * Regenerate a customer's TuneReminders after a booking is marked COMPLETED.
 * Called from updateBookingStatus's COMPLETED branch, after the CRM upsert
 * has created/refreshed the CustomerRecord for this booking's customer.
 *
 * - Frequency comes from the customer's single Piano.tuningFrequencyMonths
 *   when exactly one piano is on file; otherwise defaults to 6 months.
 * - frequency <= 6: creates a 6_MONTH reminder due at scheduledAt+frequency,
 *   plus a 12_MONTH annual fallback due at scheduledAt+12 (in case the
 *   customer misses the 6-month nudge).
 * - frequency > 6: creates only a 12_MONTH reminder due at scheduledAt+frequency.
 * - Unsent reminders for this record are replaced with fresh ones; a
 *   reminder that was already sent is left untouched (upsert no-ops on it).
 */
export async function generateRemindersForBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: { select: { email: true } } },
  });
  if (!booking?.customer.email) return;

  const customerRecord = await prisma.customerRecord.findUnique({
    where: {
      technicianId_customerEmail: {
        technicianId: booking.technicianId,
        customerEmail: booking.customer.email,
      },
    },
  });
  if (!customerRecord) return;

  const pianos = await prisma.piano.findMany({
    where: { customerRecordId: customerRecord.id },
  });
  const frequencyMonths =
    pianos.length === 1 ? pianos[0].tuningFrequencyMonths : FALLBACK_FREQUENCY_MONTHS;

  const lastTuningDate = booking.scheduledAt;

  // Drop stale unsent reminders; anything already sent is left alone below.
  await prisma.tuneReminder.deleteMany({
    where: { customerRecordId: customerRecord.id, sent: false },
  });

  const upsertReminder = (reminderType: "6_MONTH" | "12_MONTH", months: number) =>
    prisma.tuneReminder.upsert({
      where: {
        customerRecordId_reminderType: {
          customerRecordId: customerRecord.id,
          reminderType,
        },
      },
      // A row surviving the delete above was already sent — preserve it.
      update: {},
      create: {
        technicianId: booking.technicianId,
        customerRecordId: customerRecord.id,
        customerEmail: booking.customer.email!,
        reminderType,
        lastTuningDate,
        dueDate: addMonths(lastTuningDate, months),
      },
    });

  if (frequencyMonths <= 6) {
    await upsertReminder("6_MONTH", frequencyMonths);
    await upsertReminder("12_MONTH", 12);
  } else {
    await upsertReminder("12_MONTH", frequencyMonths);
  }
}

// ─── Sending ─────────────────────────────────────────────────────────

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
 * Overdue = due and unsent, regardless of technician's reminder mode.
 * Used for a dashboard badge.
 */
export async function getOverdueReminderCount(technicianId: string): Promise<number> {
  return prisma.tuneReminder.count({
    where: {
      technicianId,
      sent: false,
      dueDate: { lte: new Date() },
    },
  });
}

/**
 * Send a single tune reminder email and mark it as sent.
 * Uses idempotency: only sends if not already sent. Renders the
 * technician's RECALL MessageTemplate when they have one, else the default.
 */
export async function sendTuneReminder(
  reminderId: string,
  bookingLink: string,
): Promise<SendReminderResult> {
  try {
    const reminder = await prisma.tuneReminder.findUnique({
      where: { id: reminderId },
      include: {
        customerRecord: true,
        technician: { include: { user: true } },
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

    const template = await prisma.messageTemplate.findUnique({
      where: {
        technicianId_type: { technicianId: reminder.technicianId, type: "RECALL" },
      },
    });

    const emailContent = tuneReminderEmail(
      {
        customerName: reminder.customerRecord.customerName,
        pianoMake: reminder.customerRecord.pianoMake || undefined,
        lastTuningDate: reminder.lastTuningDate,
        technicianName: reminder.technician.user.name ?? undefined,
        businessName: reminder.technician.businessName ?? undefined,
      },
      bookingLink,
      template,
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
 * Send all due tune reminders whose technician is in AUTO mode.
 * REVIEW-mode technicians are skipped here — their reminders stay unsent
 * and surface in the recall queue UI for one-click sending instead.
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
    if (reminder.technician.reminderMode !== "AUTO") {
      console.log(`[sendAllDueReminders] Skipping ${reminder.id} — technician in REVIEW mode`);
      continue;
    }

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

// ─── Recall queue actions (technician-facing) ───────────────────────

async function requireTechnicianProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    throw new Error("Unauthorized");
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) throw new Error("Profile not found");
  return profile;
}

const REMINDERS_PATH = "/dashboard/technician/reminders";

/** Force-send one reminder now, regardless of the technician's reminder mode. */
export async function sendReminderNow(reminderId: string): Promise<SendReminderResult> {
  const profile = await requireTechnicianProfile();
  const reminder = await prisma.tuneReminder.findUnique({ where: { id: reminderId } });
  if (!reminder || reminder.technicianId !== profile.id) {
    return { success: false, reminderId, email: "", error: "Reminder not found" };
  }

  const bookingLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/search?technicianId=${profile.id}`;
  const result = await sendTuneReminder(reminderId, bookingLink);
  revalidatePath(REMINDERS_PATH);
  return result;
}

/** Mark a reminder handled without emailing (e.g. the technician called instead). */
export async function dismissReminder(reminderId: string): Promise<{ success?: boolean; error?: string }> {
  const profile = await requireTechnicianProfile();
  const reminder = await prisma.tuneReminder.findUnique({ where: { id: reminderId } });
  if (!reminder || reminder.technicianId !== profile.id) {
    return { error: "Reminder not found" };
  }
  if (reminder.sent) return { error: "Already handled" };

  await prisma.tuneReminder.update({
    where: { id: reminderId },
    data: { sent: true, sentAt: new Date() },
  });
  revalidatePath(REMINDERS_PATH);
  return { success: true };
}

// ─── Settings: reminder mode + message templates ────────────────────

export async function updateReminderMode(mode: string): Promise<{ success?: boolean; error?: string }> {
  if (mode !== "AUTO" && mode !== "REVIEW") return { error: "Invalid reminder mode" };
  const profile = await requireTechnicianProfile();
  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data: { reminderMode: mode },
  });
  revalidatePath(REMINDERS_PATH);
  return { success: true };
}

const templateSchema = z.object({
  type: z.enum(["RECALL", "APPT_REMINDER"]),
  subject: z.string().min(1, "Subject is required").max(120, "Subject must be 120 characters or fewer"),
  body: z.string().min(1, "Body is required").max(2000, "Body must be 2000 characters or fewer"),
  sendOffsetHours: z.coerce.number().int().min(1).max(168).optional(),
});

/** Create or update the technician's template for a message type (one per type). */
export async function saveMessageTemplate(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const profile = await requireTechnicianProfile();

  const raw = Object.fromEntries(formData.entries());
  const result = templateSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const data = result.data;

  const sendOffsetHours =
    data.type === "APPT_REMINDER" ? data.sendOffsetHours ?? 24 : null;

  await prisma.messageTemplate.upsert({
    where: {
      technicianId_type: { technicianId: profile.id, type: data.type },
    },
    update: {
      subject: data.subject,
      body: data.body,
      sendOffsetHours,
    },
    create: {
      technicianId: profile.id,
      type: data.type,
      subject: data.subject,
      body: data.body,
      sendOffsetHours,
    },
  });

  revalidatePath(REMINDERS_PATH);
  return { success: true };
}
