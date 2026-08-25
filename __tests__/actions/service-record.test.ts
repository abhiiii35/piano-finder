import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mockTechnicianSession, fixtures, makeFormData } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  createServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
  createServiceRecordFromBooking,
  saveHistoryViewPrefs,
  saveClientViewPrefs,
} from "@/actions/service-record";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

const ownedPiano = { ...fixtures.piano, customerRecord: fixtures.customerRecord };
const otherTechPiano = {
  ...fixtures.piano,
  customerRecord: { ...fixtures.customerRecord, technicianId: "other-tech-profile" },
};
const ownedRecord = { ...fixtures.serviceRecord, piano: ownedPiano };
const otherTechRecord = { ...fixtures.serviceRecord, piano: otherTechPiano };

describe("createServiceRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a manual record scoped to the owning technician", async () => {
    setupTechSession();
    prismaMock.piano.findUnique.mockResolvedValue(ownedPiano);
    prismaMock.serviceRecord.create.mockResolvedValue({});

    const fd = makeFormData({ date: "2026-06-01", workPerformed: "Tuned to A440" });
    const result = await createServiceRecord("piano-1", fd);

    expect(result.success).toBe(true);
    expect(prismaMock.serviceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pianoId: "piano-1", technicianId: "tech-profile-1", source: "MANUAL" }),
      })
    );
  });

  it("rejects a piano owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.piano.findUnique.mockResolvedValue(otherTechPiano);

    const fd = makeFormData({ date: "2026-06-01" });
    const result = await createServiceRecord("piano-1", fd);

    expect(result.error).toBe("Piano not found");
    expect(prismaMock.serviceRecord.create).not.toHaveBeenCalled();
  });

  it("rejects out-of-range readings", async () => {
    setupTechSession();
    prismaMock.piano.findUnique.mockResolvedValue(ownedPiano);

    const fd = makeFormData({ date: "2026-06-01", humidityPct: "101" });
    const result = await createServiceRecord("piano-1", fd);

    expect(result.error).toBeDefined();
    expect(prismaMock.serviceRecord.create).not.toHaveBeenCalled();
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" },
    });
    const fd = makeFormData({ date: "2026-06-01" });
    await expect(createServiceRecord("piano-1", fd)).rejects.toThrow("Unauthorized");
  });
});

describe("updateServiceRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a record owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.serviceRecord.findUnique.mockResolvedValue(otherTechRecord);

    const fd = makeFormData({ date: "2026-06-01" });
    const result = await updateServiceRecord("record-svc-1", fd);

    expect(result.error).toBe("Record not found");
    expect(prismaMock.serviceRecord.update).not.toHaveBeenCalled();
  });

  it("updates an owned record", async () => {
    setupTechSession();
    prismaMock.serviceRecord.findUnique.mockResolvedValue(ownedRecord);
    prismaMock.serviceRecord.update.mockResolvedValue({});

    const fd = makeFormData({ date: "2026-06-01", humidityPct: "50" });
    const result = await updateServiceRecord("record-svc-1", fd);

    expect(result.success).toBe(true);
  });
});

describe("deleteServiceRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects deleting a record owned by another technician", async () => {
    setupTechSession();
    prismaMock.serviceRecord.findUnique.mockResolvedValue(otherTechRecord);

    const result = await deleteServiceRecord("record-svc-1");

    expect(result.error).toBe("Record not found");
    expect(prismaMock.serviceRecord.delete).not.toHaveBeenCalled();
  });

  it("deletes an owned record", async () => {
    setupTechSession();
    prismaMock.serviceRecord.findUnique.mockResolvedValue(ownedRecord);
    prismaMock.serviceRecord.delete.mockResolvedValue({});

    const result = await deleteServiceRecord("record-svc-1");

    expect(result.success).toBe(true);
  });
});

describe("createServiceRecordFromBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  const completedBooking = {
    ...fixtures.booking,
    id: "booking-1",
    status: "COMPLETED",
    customer: { name: "Jane Doe", email: "jane@example.com" },
    services: [{ service: { name: "Standard Tuning" } }, { service: { name: "Pitch Raise" } }],
  };

  it("no-ops when the booking is not completed", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({ ...completedBooking, status: "CONFIRMED" });

    await createServiceRecordFromBooking("booking-1");

    expect(prismaMock.customerRecord.upsert).not.toHaveBeenCalled();
    expect(prismaMock.serviceRecord.create).not.toHaveBeenCalled();
  });

  it("no-ops when a record already exists for this booking (idempotent)", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(completedBooking);
    prismaMock.serviceRecord.findFirst.mockResolvedValue(fixtures.serviceRecord);

    await createServiceRecordFromBooking("booking-1");

    expect(prismaMock.customerRecord.upsert).not.toHaveBeenCalled();
    expect(prismaMock.serviceRecord.create).not.toHaveBeenCalled();
  });

  it("matches an existing piano by make+model and joins service names", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(completedBooking);
    prismaMock.serviceRecord.findFirst.mockResolvedValue(null);
    prismaMock.customerRecord.upsert.mockResolvedValue(fixtures.customerRecord);
    prismaMock.piano.findFirst.mockResolvedValue(fixtures.piano);
    prismaMock.serviceRecord.create.mockResolvedValue({});

    await createServiceRecordFromBooking("booking-1");

    expect(prismaMock.piano.create).not.toHaveBeenCalled();
    expect(prismaMock.serviceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pianoId: fixtures.piano.id,
          bookingId: "booking-1",
          source: "PLATFORM",
          workPerformed: "Standard Tuning, Pitch Raise",
          clientVisible: true,
        }),
      })
    );
  });

  it("creates a new piano when no make/model match is found", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(completedBooking);
    prismaMock.serviceRecord.findFirst.mockResolvedValue(null);
    prismaMock.customerRecord.upsert.mockResolvedValue(fixtures.customerRecord);
    prismaMock.piano.findFirst.mockResolvedValue(null);
    prismaMock.piano.create.mockResolvedValue({ ...fixtures.piano, id: "new-piano" });
    prismaMock.serviceRecord.create.mockResolvedValue({});

    await createServiceRecordFromBooking("booking-1");

    expect(prismaMock.piano.create).toHaveBeenCalledOnce();
    expect(prismaMock.serviceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pianoId: "new-piano" }) })
    );
  });

  it("reuses the customer's sole existing piano when the booking has no make/model", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      ...completedBooking,
      pianoMake: null,
      pianoModel: null,
    });
    prismaMock.serviceRecord.findFirst.mockResolvedValue(null);
    prismaMock.customerRecord.upsert.mockResolvedValue(fixtures.customerRecord);
    prismaMock.piano.findMany.mockResolvedValue([fixtures.piano]);
    prismaMock.serviceRecord.create.mockResolvedValue({});

    await createServiceRecordFromBooking("booking-1");

    expect(prismaMock.piano.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.piano.create).not.toHaveBeenCalled();
    expect(prismaMock.serviceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pianoId: fixtures.piano.id }) })
    );
  });

  it("no-ops when the booking has no customer email", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      ...completedBooking,
      customer: { name: "Jane Doe", email: null },
    });

    await createServiceRecordFromBooking("booking-1");

    expect(prismaMock.customerRecord.upsert).not.toHaveBeenCalled();
  });
});

describe("saveHistoryViewPrefs / saveClientViewPrefs", () => {
  beforeEach(() => vi.clearAllMocks());

  const validHistoryPrefs = {
    order: "oldest" as const,
    show: { readings: true, photos: false, recommendations: true, internalNotes: false },
    quickLogPresets: ["Voicing touch-up"],
  };

  it("persists valid history prefs as JSON", async () => {
    setupTechSession();
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await saveHistoryViewPrefs(validHistoryPrefs);

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { historyViewPrefs: JSON.stringify(validHistoryPrefs) },
    });
  });

  it("rejects a malformed order value", async () => {
    setupTechSession();
    const result = await saveHistoryViewPrefs({ ...validHistoryPrefs, order: "sideways" as never });

    expect(result.error).toBeDefined();
    expect(prismaMock.technicianProfile.update).not.toHaveBeenCalled();
  });

  it("persists valid client prefs as JSON", async () => {
    setupTechSession();
    prismaMock.technicianProfile.update.mockResolvedValue({});
    const validClientPrefs = {
      show: { readings: true, photos: true, recommendations: true, workPerformed: false, prices: true },
    };

    const result = await saveClientViewPrefs(validClientPrefs);

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { clientViewPrefs: JSON.stringify(validClientPrefs) },
    });
  });

  it("rejects non-technician for prefs saves", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" } });
    await expect(saveHistoryViewPrefs(validHistoryPrefs)).rejects.toThrow("Unauthorized");
  });
});
