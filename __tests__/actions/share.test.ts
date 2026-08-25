import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mockTechnicianSession, fixtures } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { enableShareLink, revokeShareLink } from "@/actions/share";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

describe("enableShareLink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates and stores a new token for an owned customer record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue({ ...fixtures.customerRecord, shareToken: null });
    prismaMock.customerRecord.update.mockResolvedValue({});

    const result = await enableShareLink("record-1");

    expect(result.success).toBe(true);
    expect(result.shareToken).toMatch(/^[0-9a-f]{48}$/);
    expect(prismaMock.customerRecord.update).toHaveBeenCalledWith({
      where: { id: "record-1" },
      data: { shareToken: result.shareToken },
    });
  });

  it("is idempotent: returns the existing token without writing again", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue({ ...fixtures.customerRecord, shareToken: "abc123" });

    const result = await enableShareLink("record-1");

    expect(result.shareToken).toBe("abc123");
    expect(prismaMock.customerRecord.update).not.toHaveBeenCalled();
  });

  it("rejects a customer record owned by another technician", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(null);

    const result = await enableShareLink("other-tech-record");

    expect(result.error).toBe("Customer record not found");
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" } });
    await expect(enableShareLink("record-1")).rejects.toThrow("Unauthorized");
  });
});

describe("revokeShareLink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears the share token on an owned customer record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue({ ...fixtures.customerRecord, shareToken: "abc123" });
    prismaMock.customerRecord.update.mockResolvedValue({});

    const result = await revokeShareLink("record-1");

    expect(result.success).toBe(true);
    expect(prismaMock.customerRecord.update).toHaveBeenCalledWith({
      where: { id: "record-1" },
      data: { shareToken: null },
    });
  });

  it("rejects a customer record owned by another technician", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(null);

    const result = await revokeShareLink("other-tech-record");

    expect(result.error).toBe("Customer record not found");
    expect(prismaMock.customerRecord.update).not.toHaveBeenCalled();
  });
});
