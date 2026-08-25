import { buildEmailHtml } from "@/lib/email";
import { format } from "date-fns";
import { renderTemplate, bodyToHtml, DEFAULT_APPT_REMINDER } from "@/lib/reminder-templates";

type ApptReminderInfo = {
  customerName: string;
  pianoMake?: string;
  bookingTime: Date;
  technicianName?: string;
  businessName?: string;
};

export type ApptReminderTemplate = { subject: string; body: string } | null | undefined;

/**
 * Builds the upcoming-appointment reminder email. Uses the technician's
 * saved APPT_REMINDER MessageTemplate when provided, otherwise the default.
 */
export function apptReminderEmail(
  info: ApptReminderInfo,
  template?: ApptReminderTemplate,
): { subject: string; html: string } {
  const vars = {
    customerName: info.customerName,
    pianoMake: info.pianoMake || "your piano",
    bookingTime: format(new Date(info.bookingTime), "EEEE, MMMM d 'at' h:mm a"),
    technicianName: info.technicianName ?? "",
    businessName: info.businessName ?? "",
  };

  const subject = renderTemplate(template?.subject ?? DEFAULT_APPT_REMINDER.subject, vars);
  const body = renderTemplate(template?.body ?? DEFAULT_APPT_REMINDER.body, vars);

  return {
    subject,
    html: buildEmailHtml(subject, bodyToHtml(body)),
  };
}
