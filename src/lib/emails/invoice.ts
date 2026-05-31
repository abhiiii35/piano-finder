import { buildEmailHtml } from "@/lib/email";

export function invoiceEmail(technicianName: string) {
  const html = buildEmailHtml(
    "Your Invoice",
    `<p>Your invoice from <strong>${technicianName}</strong> is attached as a PDF.</p>`
  );
  return { subject: `Your invoice from ${technicianName} — PianoTuner`, html };
}
