import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { apptReminderEmail } from "@/lib/emails/apptReminder";

const DEFAULT_OFFSET_HOURS = 24;

/**
 * A booking is due for its appointment reminder when scheduledAt falls in
 * the half-open window (now + offset - 1h, now + offset]. This cron has no
 * "reminded" flag to check (no schema change) — instead each hourly run
 * only claims a 1-hour-wide slice of the timeline, offset hours out. Two
 * consecutive hourly runs never overlap because the window is exclusive on
 * the near edge and inclusive on the far edge, so a booking landing exactly
 * on the boundary is claimed by exactly one run.
 *
 * IMPORTANT: this cron MUST run hourly. A missed hour is a missed reminder
 * for any booking whose scheduledAt fell in that hour's window — acceptable
 * for v1; revisit with a `remindedAt` column if that's not good enough.
 */
export function isDueForAppointmentReminder(
  scheduledAt: Date,
  now: Date,
  offsetHours: number,
): boolean {
  const windowEnd = now.getTime() + offsetHours * 60 * 60 * 1000;
  const windowStart = windowEnd - 60 * 60 * 1000;
  const t = scheduledAt.getTime();
  return t > windowStart && t <= windowEnd;
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[appointment-reminders cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 500 },
    );
  }

  if (cronSecret !== expectedSecret) {
    console.error("[appointment-reminders cron] Invalid cron secret");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const now = new Date();

    const confirmedBookings = await prisma.booking.findMany({
      where: { status: "CONFIRMED" },
      include: {
        customer: { select: { name: true, email: true } },
        technician: { include: { user: { select: { name: true } } } },
      },
    });

    const technicianIds = [...new Set(confirmedBookings.map((b) => b.technicianId))];
    const templates = technicianIds.length
      ? await prisma.messageTemplate.findMany({
          where: { technicianId: { in: technicianIds }, type: "APPT_REMINDER" },
        })
      : [];
    const templateByTech = new Map(templates.map((t) => [t.technicianId, t]));

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const booking of confirmedBookings) {
      if (!booking.customer.email) {
        skipped++;
        continue;
      }

      const template = templateByTech.get(booking.technicianId) ?? null;
      const offsetHours = template?.sendOffsetHours ?? DEFAULT_OFFSET_HOURS;

      if (!isDueForAppointmentReminder(new Date(booking.scheduledAt), now, offsetHours)) {
        skipped++;
        continue;
      }

      try {
        const email = apptReminderEmail(
          {
            customerName: booking.customer.name ?? "there",
            pianoMake: booking.pianoMake ?? undefined,
            bookingTime: booking.scheduledAt,
            technicianName: booking.technician.user.name ?? undefined,
            businessName: booking.technician.businessName ?? undefined,
          },
          template,
        );
        await sendEmail({ to: booking.customer.email, ...email });
        sent++;
      } catch (error) {
        console.error(`[appointment-reminders cron] Failed for booking ${booking.id}:`, error);
        failed++;
      }
    }

    console.log(
      `[appointment-reminders cron] Completed: ${sent} sent, ${failed} failed, ${skipped} skipped`,
    );

    return NextResponse.json({
      success: true,
      processed: confirmedBookings.length,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("[appointment-reminders cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
