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
import {
  createServiceLocation,
  updateServiceLocation,
  deleteServiceLocation,
} from "@/actions/service-location";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
  prismaMock.$transaction.mockImplementation((cb: (tx: typeof prismaMock) => unknown) =>
    cb(prismaMock)
  );
}

describe("createServiceLocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a location scoped to the owning customer record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.serviceLocation.create.mockResolvedValue(fixtures.serviceLocation);

    const fd = makeFormData({ label: "Home", city: "Boston" });
    const result = await createServiceLocation("record-1", fd);

    expect(result.success).toBe(true);
    expect(prismaMock.serviceLocation.create).toHaveBeenCalledOnce();
  });

  it("rejects a customer record owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ label: "Home" });
    const result = await createServiceLocation("other-tech-record", fd);

    expect(result.error).toBe("Customer record not found");
    expect(prismaMock.serviceLocation.create).not.toHaveBeenCalled();
  });

  it("rejects missing label", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);

    const fd = makeFormData({ label: "" });
    const result = await createServiceLocation("record-1", fd);

    expect(result.error).toBeDefined();
  });

  it("clears other primary locations when creating a new primary (exclusivity)", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.serviceLocation.create.mockResolvedValue({
      ...fixtures.serviceLocation,
      id: "location-2",
    });

    const fd = makeFormData({ label: "Recital hall", isPrimary: "on" });
    await createServiceLocation("record-1", fd);

    expect(prismaMock.serviceLocation.updateMany).toHaveBeenCalledWith({
      where: { customerRecordId: "record-1", isPrimary: true },
      data: { isPrimary: false },
    });
  });
});

describe("updateServiceLocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a location owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.serviceLocation.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ label: "Home" });
    const result = await updateServiceLocation("other-tech-location", fd);

    expect(result.error).toBe("Service location not found");
    expect(prismaMock.serviceLocation.update).not.toHaveBeenCalled();
  });

  it("excludes itself when clearing other primaries", async () => {
    setupTechSession();
    prismaMock.serviceLocation.findFirst.mockResolvedValue(fixtures.serviceLocation);
    prismaMock.serviceLocation.update.mockResolvedValue({});

    const fd = makeFormData({ label: "Home", isPrimary: "on" });
    await updateServiceLocation("location-1", fd);

    expect(prismaMock.serviceLocation.updateMany).toHaveBeenCalledWith({
      where: {
        customerRecordId: "record-1",
        isPrimary: true,
        NOT: { id: "location-1" },
      },
      data: { isPrimary: false },
    });
  });
});

describe("deleteServiceLocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects deleting a location owned by another technician", async () => {
    setupTechSession();
    prismaMock.serviceLocation.findFirst.mockResolvedValue(null);

    const result = await deleteServiceLocation("other-tech-location");

    expect(result.error).toBe("Service location not found");
    expect(prismaMock.serviceLocation.delete).not.toHaveBeenCalled();
  });
});
