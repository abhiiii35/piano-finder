import { describe, it, expect } from "vitest";
import { profileApprovedEmail, profileRejectedEmail } from "@/lib/emails/onboarding";

describe("profileApprovedEmail", () => {
  it("returns subject and html with technician name", () => {
    const result = profileApprovedEmail("Mike Tuner");
    expect(result.subject).toBe("Your profile is live!");
    expect(result.html).toContain("Mike Tuner");
    expect(result.html).toContain("approved");
  });
});

describe("profileRejectedEmail", () => {
  it("returns subject and html with reason", () => {
    const result = profileRejectedEmail("Mike Tuner", "Please add a more detailed bio.");
    expect(result.subject).toBe("Your profile needs changes");
    expect(result.html).toContain("Mike Tuner");
    expect(result.html).toContain("Please add a more detailed bio.");
  });
});
