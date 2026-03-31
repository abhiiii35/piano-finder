import { describe, it, expect } from "vitest";
import { newMessageEmail } from "@/lib/emails/message";

describe("newMessageEmail", () => {
  it("returns subject and html for booking thread", () => {
    const result = newMessageEmail("Jane Doe", "Mike Tuner", "Is there parking available?", "March 15, 2026");
    expect(result.subject).toContain("booking");
    expect(result.html).toContain("Jane Doe");
    expect(result.html).toContain("Is there parking available?");
  });

  it("returns subject and html for inquiry thread", () => {
    const result = newMessageEmail("Jane Doe", "Mike Tuner", "Do you service player pianos?");
    expect(result.subject).toContain("Jane Doe");
    expect(result.html).toContain("Do you service player pianos?");
  });

  it("truncates long messages to 200 chars in preview", () => {
    const longMessage = "A".repeat(300);
    const result = newMessageEmail("Jane", "Mike", longMessage);
    expect(result.html).toContain("A".repeat(200));
    expect(result.html).not.toContain("A".repeat(201));
  });
});
