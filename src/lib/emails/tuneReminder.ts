import { buildEmailHtml } from "@/lib/email";
import { format } from "date-fns";
import { renderTemplate, bodyToHtml, DEFAULT_RECALL } from "@/lib/reminder-templates";

type TuneReminderInfo = {
  customerName: string;
  pianoMake?: string;
  lastTuningDate: Date;
  technicianName?: string;
  businessName?: string;
};

export type RecallTemplate = { subject: string; body: string } | null | undefined;

/**
 * Builds the recall (tune reminder) email. Uses the technician's saved
 * RECALL MessageTemplate when provided, otherwise DEFAULT_RECALL.
 */
export function tuneReminderEmail(
  info: TuneReminderInfo,
  bookingLink: string,
  template?: RecallTemplate,
): { subject: string; html: string } {
  const vars = {
    customerName: info.customerName,
    pianoMake: info.pianoMake || "Your piano",
    lastServiceDate: format(new Date(info.lastTuningDate), "MMMM d, yyyy"),
    technicianName: info.technicianName ?? "",
    businessName: info.businessName ?? "",
  };

  const subject = renderTemplate(template?.subject ?? DEFAULT_RECALL.subject, vars);
  const body = renderTemplate(template?.body ?? DEFAULT_RECALL.body, vars);

  const cta = `<p style="margin-top:24px;"><a href="${bookingLink}" style="display:inline-block;background-color:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Schedule Your Tuning</a></p>`;

  return {
    subject,
    html: buildEmailHtml(subject, `${bodyToHtml(body)}${cta}`),
  };
}
