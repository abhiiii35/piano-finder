"use server";

import { sendEmail, buildEmailHtml } from "@/lib/email";
import {
  buildBookingConfirmationEmail,
  buildPostTuningEmail,
  type BookingConfirmationEmailData,
  type PostTuningEmailData,
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
