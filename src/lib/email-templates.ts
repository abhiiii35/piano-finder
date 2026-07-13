/**
 * Email templates for lifecycle events (Pillar 3: Reminder & lifecycle email)
 * - Booking confirmation
 * - Post-tuning thank you + care tips
 *
 * Note: tune-due reminder emails live in src/lib/emails/tuneReminder.ts and are
 * sent via the TuneReminder cron pipeline (src/actions/reminders.ts).
 */

export interface BookingConfirmationEmailData {
  customerName: string;
  technicianName: string;
  technicianPhone?: string;
  scheduledAt: Date;
  durationMin: number;
  address: string;
  pianoType?: string;
  notes?: string;
  bookingId: string;
}

export interface PostTuningEmailData {
  customerName: string;
  technicianName: string;
  nextTuneDueDate: string;
  nextTuneDueMonth: string;
  bookingId: string;
}

/**
 * Booking confirmation email — sent after booking is confirmed.
 * Sets expectations: what to prepare, what to bring, confirm date/time.
 */
export function buildBookingConfirmationEmail(
  data: BookingConfirmationEmailData
): string {
  const dateStr = data.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = data.scheduledAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `
<h2>Your piano tuning is scheduled!</h2>
<p>Hi ${data.customerName},</p>

<p>Your piano tuning appointment is confirmed for <strong>${dateStr} at ${timeStr}</strong>.</p>

<h3>Appointment details</h3>
<ul>
  <li><strong>Technician:</strong> ${data.technicianName}${data.technicianPhone ? ` · ${data.technicianPhone}` : ""}</li>
  <li><strong>Location:</strong> ${data.address}</li>
  <li><strong>Estimated time:</strong> ${data.durationMin} minutes</li>
  ${data.pianoType ? `<li><strong>Piano type:</strong> ${data.pianoType}</li>` : ""}
</ul>

<h3>How to prepare</h3>
<ul>
  <li><strong>Clear access:</strong> Make sure your technician can easily reach the piano and any lid props or tools needed.</li>
  <li><strong>Quiet space:</strong> The tuning requires careful listening — minimal background noise helps.</li>
  <li><strong>Room temperature:</strong> If possible, keep the room at a steady temperature the night before. Big swings can affect how the piano settles.</li>
  <li><strong>Contact info:</strong> Have your phone nearby — the technician may call 30 minutes before arrival.</li>
</ul>

${data.notes ? `<h3>Special notes for this appointment</h3><p>${data.notes}</p>` : ""}

<p>If you need to reschedule or have questions, contact your technician or reply to this email.</p>

<p>Looking forward to getting your piano sounding beautiful!</p>
  `;
}

/**
 * Post-tuning email — sent after tuning is completed.
 * Thanks the customer, provides care tips, sets expectation for next tuning.
 */
export function buildPostTuningEmail(data: PostTuningEmailData): string {
  return `
<h2>Thanks for booking with ${data.technicianName}!</h2>
<p>Hi ${data.customerName},</p>

<p>Your piano has been tuned and is ready to play! Here are a few tips to keep it sounding great.</p>

<h3>Care tips after your tuning</h3>
<ul>
  <li><strong>Humidity is key:</strong> A piano stays in tune best when indoor humidity stays between 40–60%. In dry climates or heated homes, consider a room humidifier or an in-piano humidity control system.</li>
  <li><strong>Avoid direct sunlight:</strong> Sunlight can unevenly heat the soundboard and cause it to warp slightly. Use curtains if the piano sits near a window.</li>
  <li><strong>Keep the lid closed when not playing:</strong> This helps regulate internal temperature and humidity and protects the strings from dust.</li>
  <li><strong>Let it settle:</strong> If your piano needed a pitch raise, the strings will continue stretching slightly over the next few weeks. A small amount of detuning is normal.</li>
</ul>

<h3>When to tune again</h3>
<p>For a piano played regularly, plan your next tuning around <strong>${data.nextTuneDueMonth}</strong> (${data.nextTuneDueDate}). Regular annual tunings (or twice-yearly for heavily-used pianos) are the most cost-effective way to keep your piano sounding good.</p>

<p>Many piano owners set a calendar reminder 2–3 months before the due date, so they can book their technician early — good techs book up during peak seasons.</p>

<p>Thank you for choosing Book A Piano Tuner. We're here to help you keep your piano in great shape!</p>
  `;
}
