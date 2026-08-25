import { describe, it, expect } from "vitest";
import {
  escapeICSText,
  formatICSDateUTC,
  foldICSLine,
  buildCalendarICS,
} from "@/lib/ics";

describe("escapeICSText", () => {
  it("escapes backslash, comma, semicolon, and newline per RFC 5545", () => {
    expect(escapeICSText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("normalizes CRLF to a single escaped newline", () => {
    expect(escapeICSText("line1\r\nline2")).toBe("line1\\nline2");
  });

  it("leaves plain text untouched", () => {
    expect(escapeICSText("Standard Tuning")).toBe("Standard Tuning");
  });
});

describe("formatICSDateUTC", () => {
  it("formats a fixed UTC instant as YYYYMMDDTHHMMSSZ", () => {
    expect(formatICSDateUTC(new Date("2026-04-15T14:30:05Z"))).toBe(
      "20260415T143005Z"
    );
  });

  it("converts a local-time Date to its correct UTC instant regardless of runner timezone", () => {
    const d = new Date(2026, 3, 15, 10, 0, 0);
    const expected = d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    expect(formatICSDateUTC(d)).toBe(expected);
  });
});

describe("foldICSLine", () => {
  it("returns short lines unchanged", () => {
    expect(foldICSLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("does not fold a line at exactly 75 octets", () => {
    const line = "X".repeat(75);
    expect(foldICSLine(line)).toBe(line);
  });

  it("folds a line of 76 octets into two physical lines", () => {
    const line = "X".repeat(76);
    const folded = foldICSLine(line);
    const parts = folded.split("\r\n");
    expect(parts).toHaveLength(2);
    expect(parts[1].startsWith(" ")).toBe(true);
  });

  it("folds long lines with a CRLF + single leading space, each line <=75 octets", () => {
    const line = "SUMMARY:" + "A".repeat(100);
    const folded = foldICSLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    expect(Buffer.byteLength(parts[0], "utf8")).toBe(75);
    for (const p of parts.slice(1)) {
      expect(p.startsWith(" ")).toBe(true);
      expect(Buffer.byteLength(p, "utf8")).toBeLessThanOrEqual(75);
    }
    // unfolding (stripping CRLF + leading space) reconstructs the original
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("does not split a multi-byte UTF-8 character across a fold", () => {
    const line = "DESCRIPTION:" + "🎹".repeat(30);
    const folded = foldICSLine(line);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    expect(folded).not.toContain("�");
  });
});

describe("buildCalendarICS", () => {
  const booking = {
    id: "booking-1",
    scheduledAt: new Date("2026-04-15T14:00:00Z"),
    durationMin: 90,
    customerName: "Jane, Doe",
    addressLine1: "123 Main St",
    addressLine2: null,
    city: "Boston",
    state: "MA",
    zipCode: "02108",
    serviceNames: ["Standard Tuning", "Pitch Raise"],
    notes: "Ring the back doorbell",
  };
  const now = new Date("2026-04-01T00:00:00Z");

  it("builds a VCALENDAR with one escaped VEVENT per booking", () => {
    const ics = buildCalendarICS([booking], now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("END:VCALENDAR\r\n");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:booking-1@bookatuner");
    expect(ics).toContain("DTSTAMP:20260401T000000Z");
    expect(ics).toContain("DTSTART:20260415T140000Z");
    expect(ics).toContain("DTEND:20260415T153000Z"); // scheduledAt + 90min
    // comma in the customer name is escaped
    expect(ics).toContain("SUMMARY:Piano service — Jane\\, Doe");
    expect(ics).toContain("LOCATION:123 Main St\\, Boston\\, MA 02108");
    expect(ics).toContain(
      "DESCRIPTION:Standard Tuning\\, Pitch Raise\\nRing the back doorbell"
    );
  });

  it("uses CRLF line endings throughout", () => {
    const ics = buildCalendarICS([booking], now);
    expect(/(?<!\r)\n/.test(ics)).toBe(false);
  });

  it("returns just the calendar shell for no bookings", () => {
    expect(buildCalendarICS([], now)).toBe(
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Book A Piano Tuner//Calendar Feed//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR\r\n"
    );
  });
});
