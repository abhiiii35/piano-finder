// Shared placeholder rendering for TuneReminder (RECALL) and appointment
// (APPT_REMINDER) MessageTemplate emails.

export type TemplateVars = Partial<{
  customerName: string;
  pianoMake: string;
  lastServiceDate: string;
  bookingTime: string;
  technicianName: string;
  businessName: string;
}>;

export const PLACEHOLDER_KEYS = [
  "customerName",
  "pianoMake",
  "lastServiceDate",
  "bookingTime",
  "technicianName",
  "businessName",
] as const;

const PLACEHOLDER_RE = new RegExp(`\\{(${PLACEHOLDER_KEYS.join("|")})\\}`, "g");

/** Replace {placeholder} tokens with vars; missing/unset vars become "". */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(PLACEHOLDER_RE, (_match, key: keyof TemplateVars) => vars[key] ?? "");
}

/** Plain-text template body (blank-line paragraphs) to simple HTML. */
export function bodyToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export const DEFAULT_RECALL = {
  subject: "Time to schedule your next piano tuning",
  body: `Hi {customerName},

It's been a while since {pianoMake} was last tuned, on {lastServiceDate}. Regular tuning keeps it sounding its best and protects the instrument.

Reply to this email or book online to schedule your next visit.

{technicianName}
{businessName}`,
};

export const DEFAULT_APPT_REMINDER = {
  subject: "Reminder: your piano tuning appointment",
  body: `Hi {customerName},

This is a reminder that your piano tuning appointment is scheduled for {bookingTime}.

See you then!

{technicianName}
{businessName}`,
};
