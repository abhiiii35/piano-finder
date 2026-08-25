// Hand-rolled RFC 5545 (iCalendar) text builder for the technician calendar
// feed. No library — the format needed here is small: one VCALENDAR with a
// VEVENT per booking.

// TEXT value type (SUMMARY, LOCATION, DESCRIPTION) must escape backslash,
// comma, semicolon, and newline. Order matters: backslashes first so we
// don't double-escape the ones we just inserted.
export function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// UTC "Z" form: YYYYMMDDTHHMMSSZ.
export function formatICSDateUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC 5545 3.1: content lines SHOULD NOT exceed 75 octets (not characters).
// Longer lines fold into a CRLF followed by a single leading space; the
// space counts against the 75-octet budget of each continuation line.
// Never split inside a multi-byte UTF-8 sequence.
export function foldICSLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let offset = 0;
  let limit = 75;
  while (offset < bytes.length) {
    let end = Math.min(offset + limit, bytes.length);
    // back off past UTF-8 continuation bytes (10xxxxxx), but always progress
    while (end > offset + 1 && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push(bytes.subarray(offset, end).toString("utf8"));
    offset = end;
    limit = 74; // 74 content octets + 1 leading space = 75
  }
  return chunks.join("\r\n ");
}

export type ICSBooking = {
  id: string;
  scheduledAt: Date;
  durationMin: number;
  customerName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  serviceNames: string[];
  notes: string | null;
};

export function buildCalendarICS(bookings: ICSBooking[], now: Date = new Date()): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Book A Piano Tuner//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const dtstamp = formatICSDateUTC(now);
  for (const booking of bookings) {
    const dtstart = formatICSDateUTC(booking.scheduledAt);
    const dtend = formatICSDateUTC(
      new Date(booking.scheduledAt.getTime() + booking.durationMin * 60_000)
    );
    const location = [
      booking.addressLine1,
      booking.addressLine2,
      `${booking.city}, ${booking.state} ${booking.zipCode}`,
    ]
      .filter(Boolean)
      .join(", ");
    const description = [booking.serviceNames.join(", "), booking.notes]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${booking.id}@bookatuner`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeICSText(`Piano service — ${booking.customerName}`)}`,
      `LOCATION:${escapeICSText(location)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldICSLine).join("\r\n") + "\r\n";
}
