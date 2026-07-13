"use server";

import { sendEmail, buildEmailHtml } from "@/lib/email";
import {
  buildBookingConfirmationEmail,
  buildPostTuningEmail,
  buildTuneDueReminderEmail,
  type BookingConfirmationEmailData,
  type PostTuningEmailData,
  type TuneDueReminderEmailData,
} from "@/lib/email-templates";

/**
 * Send booking confirmation email to customer after booking is confirmed.
 * Called after Booking.status transitions to CONFIRMED.
 */
export async function sendBookingConfirmationEmail(
  customerEmail: string,
  data: BookingConfirmationEmailData
): Promise<void> {
  const bodyHtml = buildBookingConfirmationEmail(data);
  const html = buildEmailHtml("Your Piano Tuning Appointment Confirmed", bodyHtml);

  await sendEmail({
    to: customerEmail,
    subject: `Your piano tuning appointment is scheduled — ${data.scheduledAt.toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" }
    )}`,
    html,
  });
}

/**
 * Send post-tuning thank you email to customer after booking is completed.
 * Called after Booking.status transitions to COMPLETED.
 * Includes care tips and next-tune reminder.
 */
export async function sendPostTuningEmail(
  customerEmail: string,
  data: PostTuningEmailData
): Promise<void> {
  const bodyHtml = buildPostTuningEmail(data);
  const html = buildEmailHtml("Thank You for Your Piano Tuning!", bodyHtml);

  await sendEmail({
    to: customerEmail,
    subject: "Piano tuning complete — care tips and next appointment reminder",
    html,
  });
}

/**
 * Send tune-due reminder email to customer at 6 or 12 months after last tuning.
 * Call this from a background job/cron that checks for overdue bookings.
 */
export async function sendTuneDueReminderEmail(
  customerEmail: string,
  data: TuneDueReminderEmailData
): Promise<void> {
  const bodyHtml = buildTuneDueReminderEmail(data);
  const subject =
    data.monthsOverdue > 6
      ? "Your piano tuning is overdue"
      : "Time for your piano tuning";

  const html = buildEmailHtml(subject, bodyHtml);

  await sendEmail({
    to: customerEmail,
    subject,
    html,
  });
}
