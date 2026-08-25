import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  mockCustomerSession,
  fixtures,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  createExpense,
  deleteExpense,
  createMileageLog,
  deleteMileageLog,
  updateMileageLog,
} from "@/actions/expense";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(
    fixtures.technicianProfile
  );
}

describe("createExpense", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an expense with integer cents for the technician", async () => {
    setupTechSession();
    prismaMock.expense.create.mockResolvedValue(fixtures.expense);

    const result = await createExpense(
      makeFormData({
        date: "2026-06-02",
        category: "Tools & Equipment",
        amount: "45.99",
        vendor: "Schaff",
        deductible: "on",
      })
    );

    expect(result.success).toBe(true);
    const data = prismaMock.expense.create.mock.calls[0][0].data;
    expect(data.technicianId).toBe("tech-profile-1");
    expect(data.amountCents).toBe(4599);
    expect(data.deductible).toBe(true);
    expect(data.vendor).toBe("Schaff");
  });

  it("stores an optional receipt URL", async () => {
    setupTechSession();
    prismaMock.expense.create.mockResolvedValue(fixtures.expense);

    await createExpense(
      makeFormData({
        date: "2026-06-02",
        category: "Other",
        amount: "10",
        receiptUrl: "https://res.cloudinary.com/x/receipt.jpg",
      })
    );

    const data = prismaMock.expense.create.mock.calls[0][0].data;
    expect(data.receiptUrl).toBe("https://res.cloudinary.com/x/receipt.jpg");
  });

  it("returns a validation error for a bad amount", async () => {
    setupTechSession();
    const result = await createExpense(
      makeFormData({ date: "2026-06-02", category: "Other", amount: "abc" })
    );
    expect(result.error).toBeDefined();
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it("rejects non-technicians", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    await expect(
      createExpense(
        makeFormData({ date: "2026-06-02", category: "Other", amount: "10" })
      )
    ).rejects.toThrow("Unauthorized");
  });
});

describe("deleteExpense", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes only within the technician's own expenses", async () => {
    setupTechSession();
    prismaMock.expense.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteExpense("expense-1");
    expect(result.success).toBe(true);
    expect(prismaMock.expense.deleteMany).toHaveBeenCalledWith({
      where: { id: "expense-1", technicianId: "tech-profile-1" },
    });
  });
});

describe("createMileageLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a mileage log", async () => {
    setupTechSession();
    prismaMock.mileageLog.create.mockResolvedValue(fixtures.mileageLog);

    const result = await createMileageLog(
      makeFormData({
        date: "2026-01-09",
        miles: "24.6",
        purpose: "Round trip to client",
      })
    );

    expect(result.success).toBe(true);
    const data = prismaMock.mileageLog.create.mock.calls[0][0].data;
    expect(data.technicianId).toBe("tech-profile-1");
    expect(data.miles).toBe(24.6);
    expect(data.bookingId).toBeNull();
  });

  it("links to a booking owned by the technician when provided", async () => {
    setupTechSession();
    prismaMock.booking.findFirst.mockResolvedValue(fixtures.booking);
    prismaMock.mileageLog.create.mockResolvedValue(fixtures.mileageLog);

    const result = await createMileageLog(
      makeFormData({
        date: "2026-01-09",
        miles: "10",
        purpose: "Job travel",
        bookingId: "booking-1",
      })
    );

    expect(result.success).toBe(true);
    expect(prismaMock.booking.findFirst).toHaveBeenCalledWith({
      where: { id: "booking-1", technicianId: "tech-profile-1" },
    });
    expect(prismaMock.mileageLog.create.mock.calls[0][0].data.bookingId).toBe(
      "booking-1"
    );
  });

  it("rejects a booking that does not belong to the technician", async () => {
    setupTechSession();
    prismaMock.booking.findFirst.mockResolvedValue(null);

    const result = await createMileageLog(
      makeFormData({
        date: "2026-01-09",
        miles: "10",
        purpose: "Job travel",
        bookingId: "someone-elses-booking",
      })
    );

    expect(result.error).toBeDefined();
    expect(prismaMock.mileageLog.create).not.toHaveBeenCalled();
  });

  it("returns a validation error for zero miles", async () => {
    setupTechSession();
    const result = await createMileageLog(
      makeFormData({ date: "2026-01-09", miles: "0", purpose: "x" })
    );
    expect(result.error).toBeDefined();
    expect(prismaMock.mileageLog.create).not.toHaveBeenCalled();
  });
});

describe("updateMileageLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates miles for a technician's own log", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "tech-profile-1",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });
    prismaMock.mileageLog.update.mockResolvedValue(fixtures.mileageLog);

    const result = await updateMileageLog("mileage-1", { miles: "35.2" });

    expect(result.success).toBe(true);
    expect(prismaMock.mileageLog.update).toHaveBeenCalledWith({
      where: { id: "mileage-1" },
      data: { miles: 35.2 },
    });
  });

  it("updates date for a technician's own log", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "tech-profile-1",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });
    prismaMock.mileageLog.update.mockResolvedValue(fixtures.mileageLog);

    const result = await updateMileageLog("mileage-1", { date: "2026-01-10" });

    expect(result.success).toBe(true);
    const updateCall = prismaMock.mileageLog.update.mock.calls[0][0];
    expect(updateCall.data.date).toEqual(new Date(2026, 0, 10));
  });

  it("updates purpose for a technician's own log", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "tech-profile-1",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });
    prismaMock.mileageLog.update.mockResolvedValue(fixtures.mileageLog);

    const result = await updateMileageLog("mileage-1", {
      purpose: "Multiple client visits",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.mileageLog.update).toHaveBeenCalledWith({
      where: { id: "mileage-1" },
      data: { purpose: "Multiple client visits" },
    });
  });

  it("rejects update for zero miles", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "tech-profile-1",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });

    const result = await updateMileageLog("mileage-1", { miles: "0" });

    expect(result.error).toBeDefined();
    expect(prismaMock.mileageLog.update).not.toHaveBeenCalled();
  });

  it("rejects update for negative miles", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "tech-profile-1",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });

    const result = await updateMileageLog("mileage-1", { miles: "-10" });

    expect(result.error).toBeDefined();
    expect(prismaMock.mileageLog.update).not.toHaveBeenCalled();
  });

  it("rejects update for miles > 1000", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "tech-profile-1",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });

    const result = await updateMileageLog("mileage-1", { miles: "1001" });

    expect(result.error).toBeDefined();
    expect(prismaMock.mileageLog.update).not.toHaveBeenCalled();
  });

  it("rejects update when log does not belong to technician", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "other-tech-id",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });

    const result = await updateMileageLog("mileage-1", { miles: "35" });

    expect(result.error).toBe("Mileage log not found");
    expect(prismaMock.mileageLog.update).not.toHaveBeenCalled();
  });

  it("rejects update when log does not exist", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue(null);

    const result = await updateMileageLog("nonexistent", { miles: "35" });

    expect(result.error).toBe("Mileage log not found");
    expect(prismaMock.mileageLog.update).not.toHaveBeenCalled();
  });

  it("is a no-op when no updates are provided", async () => {
    setupTechSession();
    prismaMock.mileageLog.findUnique.mockResolvedValue({
      id: "mileage-1",
      technicianId: "tech-profile-1",
      date: new Date(2026, 0, 9),
      miles: 24.6,
      purpose: "Client visit",
      bookingId: null,
      autoCaptured: false,
      createdAt: new Date(),
    });

    const result = await updateMileageLog("mileage-1", {});

    expect(result.success).toBe(true);
    expect(prismaMock.mileageLog.update).not.toHaveBeenCalled();
  });
});

describe("deleteMileageLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes only within the technician's own logs", async () => {
    setupTechSession();
    prismaMock.mileageLog.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteMileageLog("mileage-1");
    expect(result.success).toBe(true);
    expect(prismaMock.mileageLog.deleteMany).toHaveBeenCalledWith({
      where: { id: "mileage-1", technicianId: "tech-profile-1" },
    });
  });
});
