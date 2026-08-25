import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/lib/reminder-templates";

describe("renderTemplate", () => {
  it("replaces every known placeholder", () => {
    const result = renderTemplate(
      "{customerName} / {pianoMake} / {lastServiceDate} / {bookingTime} / {technicianName} / {businessName}",
      {
        customerName: "Jane",
        pianoMake: "Steinway",
        lastServiceDate: "Jan 1, 2026",
        bookingTime: "Friday at 2pm",
        technicianName: "Mike",
        businessName: "Mike's Piano Service",
      },
    );

    expect(result).toBe("Jane / Steinway / Jan 1, 2026 / Friday at 2pm / Mike / Mike's Piano Service");
  });

  it("replaces a missing var with an empty string", () => {
    const result = renderTemplate("Hi {customerName}, your piano is {pianoMake}.", {
      customerName: "Jane",
    });

    expect(result).toBe("Hi Jane, your piano is .");
  });

  it("replaces every var with an empty string when none are provided", () => {
    const result = renderTemplate("{customerName}{pianoMake}{bookingTime}", {});
    expect(result).toBe("");
  });

  it("leaves unrecognized tokens untouched", () => {
    const result = renderTemplate("Hello {unknownToken}", { customerName: "Jane" });
    expect(result).toBe("Hello {unknownToken}");
  });
});
