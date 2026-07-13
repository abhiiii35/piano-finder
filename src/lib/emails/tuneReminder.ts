import { buildEmailHtml } from "@/lib/email";
import { format } from "date-fns";

type TuneReminderInfo = {
  customerName: string;
  pianoMake?: string;
  pianoModel?: string;
  lastTuningDate: Date;
  reminderType: "6_MONTH" | "12_MONTH";
};

export function tuneReminderEmail(info: TuneReminderInfo, bookingLink: string): { subject: string; html: string } {
  const lastTuningStr = format(new Date(info.lastTuningDate), "MMMM d, yyyy");
  const reminderText = info.reminderType === "6_MONTH" ? "6 months" : "1 year";
  const pianoModel = info.pianoModel ? `${info.pianoMake} ${info.pianoModel}` : info.pianoMake || "Your piano";

  return {
    subject: `It's time to tune your piano - ${reminderText} since your last service`,
    html: buildEmailHtml("Time for a Piano Tuning",
      `<p>Hi ${info.customerName},</p>
      <p>It has been ${reminderText} since your last piano tuning on <strong>${lastTuningStr}</strong>.</p>
      <p><strong>${pianoModel}</strong> performs best when regularly maintained. Regular tuning helps preserve the instrument's tone quality and playability.</p>
      <p><strong>Why regular tuning matters:</strong></p>
      <ul style="margin:16px 0;padding-left:20px;">
        <li>Maintains proper pitch and sound quality</li>
        <li>Prevents damage from string tension changes</li>
        <li>Extends the life of your piano</li>
        <li>Ensures optimal playing experience</li>
      </ul>
      <p style="margin-top:24px;">
        <a href="${bookingLink}" style="display:inline-block;background-color:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Schedule Your Tuning</a>
      </p>
      <p style="font-size:13px;color:#64748b;margin-top:24px;">If you've already scheduled a tuning, please disregard this reminder.</p>`),
  };
}
