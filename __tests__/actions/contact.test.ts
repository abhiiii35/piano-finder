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
import { createContact, updateContact, deleteContact } from "@/actions/contact";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
  // Interactive transaction: invoke the callback with prismaMock itself so
  // assertions can inspect the calls made inside it.
  prismaMock.$transaction.mockImplementation((cb: (tx: typeof prismaMock) => unknown) =>
    cb(prismaMock)
  );
}

describe("createContact", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a contact scoped to the owning customer record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.contact.create.mockResolvedValue(fixtures.contact);

    const fd = makeFormData({ name: "Jane Doe", email: "jane@example.com" });
    const result = await createContact("record-1", fd);

    expect(result.success).toBe(true);
    expect(prismaMock.contact.create).toHaveBeenCalledOnce();
  });

  it("rejects a customer record owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ name: "Jane Doe" });
    const result = await createContact("other-tech-record", fd);

    expect(result.error).toBe("Customer record not found");
    expect(prismaMock.contact.create).not.toHaveBeenCalled();
  });

  it("rejects missing name", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);

    const fd = makeFormData({ name: "" });
    const result = await createContact("record-1", fd);

    expect(result.error).toBeDefined();
  });

  it("clears other primary contacts when creating a new primary (exclusivity)", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.contact.create.mockResolvedValue({ ...fixtures.contact, id: "contact-2" });

    const fd = makeFormData({ name: "New Primary", isPrimary: "on" });
    await createContact("record-1", fd);

    expect(prismaMock.contact.updateMany).toHaveBeenCalledWith({
      where: { customerRecordId: "record-1", isPrimary: true },
      data: { isPrimary: false },
    });
  });

  it("does not touch other contacts when the new contact is not primary", async () => {
    setupTechSession();
    prismaMock.customerRecord.findFirst.mockResolvedValue(fixtures.customerRecord);
    prismaMock.contact.create.mockResolvedValue({ ...fixtures.contact, isPrimary: false });

    const fd = makeFormData({ name: "Secondary Contact" });
    await createContact("record-1", fd);

    expect(prismaMock.contact.updateMany).not.toHaveBeenCalled();
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" },
    });
    const fd = makeFormData({ name: "Jane Doe" });
    await expect(createContact("record-1", fd)).rejects.toThrow("Unauthorized");
  });
});

describe("updateContact", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a contact owned by another technician (authz)", async () => {
    setupTechSession();
    prismaMock.contact.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ name: "Jane Doe" });
    const result = await updateContact("other-tech-contact", fd);

    expect(result.error).toBe("Contact not found");
    expect(prismaMock.contact.update).not.toHaveBeenCalled();
  });

  it("excludes itself when clearing other primaries", async () => {
    setupTechSession();
    prismaMock.contact.findFirst.mockResolvedValue(fixtures.contact);
    prismaMock.contact.update.mockResolvedValue({});

    const fd = makeFormData({ name: "Jane Doe", isPrimary: "on" });
    await updateContact("contact-1", fd);

    expect(prismaMock.contact.updateMany).toHaveBeenCalledWith({
      where: {
        customerRecordId: "record-1",
        isPrimary: true,
        NOT: { id: "contact-1" },
      },
      data: { isPrimary: false },
    });
  });
});

describe("deleteContact", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects deleting a contact owned by another technician", async () => {
    setupTechSession();
    prismaMock.contact.findFirst.mockResolvedValue(null);

    const result = await deleteContact("other-tech-contact");

    expect(result.error).toBe("Contact not found");
    expect(prismaMock.contact.delete).not.toHaveBeenCalled();
  });
});
