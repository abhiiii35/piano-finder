import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  fixtures,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { createPiano, updatePiano, deletePiano } from "@/actions/piano";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

describe("createPiano", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a piano scoped to the owning customer record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.piano.create.mockResolvedValue(fixtures.piano);

    const fd = makeFormData({ make: "Steinway", model: "Model B", year: "1998" });
    const result = await createPiano("record-1", fd);

    expect(result.success).toBe(true);
    expect(prismaMock.piano.create).toHaveBeenCalledOnce();
  });

  it("rejects a customer record owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ make: "Steinway" });
    const result = await createPiano("other-tech-record", fd);

    expect(result.error).toBe("Customer record not found");
    expect(prismaMock.piano.create).not.toHaveBeenCalled();
  });

  it("rejects a year outside 1800-2100", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);

    const fd = makeFormData({ make: "Steinway", year: "1750" });
    const result = await createPiano("record-1", fd);

    expect(result.error).toBeDefined();
    expect(prismaMock.piano.create).not.toHaveBeenCalled();
  });

  it("defaults tuningFrequencyMonths to 6 when omitted", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.piano.create.mockResolvedValue(fixtures.piano);

    const fd = makeFormData({ make: "Yamaha" });
    await createPiano("record-1", fd);

    expect(prismaMock.piano.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tuningFrequencyMonths: 6 }),
      })
    );
  });

  it("rejects a serviceLocationId belonging to a different customer record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.serviceLocation.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ make: "Steinway", serviceLocationId: "loc-from-other-record" });
    const result = await createPiano("record-1", fd);

    expect(result.error).toBe("Service location not found");
    expect(prismaMock.piano.create).not.toHaveBeenCalled();
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" },
    });
    const fd = makeFormData({ make: "Steinway" });
    await expect(createPiano("record-1", fd)).rejects.toThrow("Unauthorized");
  });
});

describe("updatePiano", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a piano owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.piano.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ make: "Steinway" });
    const result = await updatePiano("other-tech-piano", fd);

    expect(result.error).toBe("Piano not found");
    expect(prismaMock.piano.update).not.toHaveBeenCalled();
  });

  it("updates an owned piano", async () => {
    setupTechSession();
    prismaMock.piano.findFirst.mockResolvedValue(fixtures.piano);
    prismaMock.piano.update.mockResolvedValue({});

    const fd = makeFormData({ make: "Yamaha", model: "U1" });
    const result = await updatePiano("piano-1", fd);

    expect(result.success).toBe(true);
  });
});

describe("deletePiano", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects deleting a piano owned by another technician", async () => {
    setupTechSession();
    prismaMock.piano.findFirst.mockResolvedValue(null);

    const result = await deletePiano("other-tech-piano");

    expect(result.error).toBe("Piano not found");
    expect(prismaMock.piano.delete).not.toHaveBeenCalled();
  });
});
