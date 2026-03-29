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
  createCustomerRecord,
  updateCustomerRecord,
  deleteCustomerRecord,
} from "@/actions/customer-record";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

describe("createCustomerRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a customer record", async () => {
    setupTechSession();
    prismaMock.customerRecord.create.mockResolvedValue({});

    const fd = makeFormData({
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      pianoMake: "Steinway",
    });

    const result = await createCustomerRecord(fd);
    expect(result.success).toBe(true);
    expect(prismaMock.customerRecord.create).toHaveBeenCalledOnce();
  });

  it("rejects missing name", async () => {
    setupTechSession();
    const fd = makeFormData({ customerName: "" });
    const result = await createCustomerRecord(fd);
    expect(result.error).toBeDefined();
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" },
    });
    const fd = makeFormData({ customerName: "Test" });
    await expect(createCustomerRecord(fd)).rejects.toThrow("Unauthorized");
  });
});

describe("updateCustomerRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates an existing record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.customerRecord.update.mockResolvedValue({});

    const fd = makeFormData({
      customerName: "Jane Updated",
      customerEmail: "jane.new@example.com",
    });

    const result = await updateCustomerRecord("record-1", fd);
    expect(result.success).toBe(true);
  });

  it("rejects update for non-existent record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ customerName: "Test" });
    const result = await updateCustomerRecord("nonexistent", fd);
    expect(result.error).toContain("not found");
  });
});

describe("deleteCustomerRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a record", async () => {
    setupTechSession();
    prismaMock.customerRecord.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCustomerRecord("record-1");
    expect(result.success).toBe(true);
    expect(prismaMock.customerRecord.deleteMany).toHaveBeenCalledWith({
      where: { id: "record-1", technicianId: "tech-profile-1" },
    });
  });
});
