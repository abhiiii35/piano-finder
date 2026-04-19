import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockCustomerSession,
  mockTechnicianSession,
  fixtures,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, body: string) => `<html>${heading}${body}</html>`),
}));

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import { sendMessage, getMessages, getOrCreateThread } from "@/actions/messages";

const mockGetSession = vi.mocked(getServerSession);
const mockSendEmail = vi.mocked(sendEmail);

describe("sendMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a message and sends email notification", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      customerId: "customer-1",
      technicianId: "tech-profile-1",
      technician: { userId: "tech-user-1" },
    });
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });
    prismaMock.message.create.mockResolvedValue({ id: "msg-new" });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ name: "Jane Doe" })
      .mockResolvedValueOnce({ name: "Mike Tuner", email: "tech@example.com" });

    const result = await sendMessage({
      threadId: "customer-1:tech-profile-1:booking-1",
      content: "Is there parking?",
      bookingId: "booking-1",
      technicianId: "tech-profile-1",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.message.create).toHaveBeenCalledOnce();
    const createData = prismaMock.message.create.mock.calls[0][0].data;
    expect(createData.senderId).toBe("customer-1");
    expect(createData.customerId).toBe("customer-1");
    expect(createData.technicianId).toBe("tech-profile-1");
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0][0].to).toBe("tech@example.com");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await sendMessage({
      threadId: "x:y:z",
      content: "hi",
      technicianId: "tech-1",
    });
    expect(result.error).toBeDefined();
  });

  it("rejects empty content", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await sendMessage({
      threadId: "x:y:z",
      content: "",
      technicianId: "tech-1",
    });
    expect(result.error).toBeDefined();
  });

  it("creates a message for inquiry thread (no bookingId)", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      userId: "tech-user-1",
    });
    prismaMock.message.create.mockResolvedValue({ id: "msg-inquiry" });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ name: "Jane Doe" })
      .mockResolvedValueOnce({ name: "Mike Tuner", email: "tech@example.com" });

    const result = await sendMessage({
      threadId: "customer-1:tech-profile-1:general",
      content: "Do you service Yamaha grands?",
      technicianId: "tech-profile-1",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.message.create).toHaveBeenCalledOnce();
    const createData = prismaMock.message.create.mock.calls[0][0].data;
    expect(createData.bookingId).toBeNull();
    expect(createData.technicianId).toBe("tech-profile-1");
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("rejects user who is not a participant", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      customerId: "other-customer",
      technicianId: "tech-profile-1",
      technician: { userId: "tech-user-1" },
    });

    const result = await sendMessage({
      threadId: "other-customer:tech-profile-1:booking-1",
      content: "hi",
      bookingId: "booking-1",
      technicianId: "tech-profile-1",
    });
    expect(result.error).toContain("authorized");
  });
});

describe("getMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns messages and marks unread ones as read", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.message.findMany.mockResolvedValue([
      { ...fixtures.message, senderId: "tech-user-1", isRead: false, sender: { name: "Mike Tuner" } },
    ]);
    prismaMock.message.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.technicianProfile.findUnique.mockResolvedValue({ userId: "tech-user-1" });

    const result = await getMessages("customer-1:tech-profile-1:booking-1");

    expect(result.messages).toHaveLength(1);
    expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
      where: {
        threadId: "customer-1:tech-profile-1:booking-1",
        senderId: { not: "customer-1" },
        isRead: false,
      },
      data: { isRead: true },
    });
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getMessages("x:y:z");
    expect(result.error).toBeDefined();
  });

  it("rejects user who is not a participant", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.message.findMany.mockResolvedValue([
      {
        ...fixtures.message,
        customerId: "other-customer",
        technicianId: "tech-profile-1",
        senderId: "other-customer",
        sender: { name: "Other Customer" },
      },
    ]);
    prismaMock.technicianProfile.findUnique.mockResolvedValue({ userId: "tech-user-1" });

    const result = await getMessages("other-customer:tech-profile-1:booking-1");
    expect(result.error).toContain("Not authorized");
  });
});

describe("getOrCreateThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns threadId for booking thread", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({ ...fixtures.technicianProfile, userId: "tech-user-1" });
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      customerId: "customer-1",
      technicianId: "tech-profile-1",
    });

    const result = await getOrCreateThread("tech-profile-1", "booking-1");
    expect(result.threadId).toBe("customer-1:tech-profile-1:booking-1");
  });

  it("returns threadId for inquiry thread", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({ ...fixtures.technicianProfile, userId: "tech-user-1" });

    const result = await getOrCreateThread("tech-profile-1");
    expect(result.threadId).toBe("customer-1:tech-profile-1:general");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getOrCreateThread("tech-1");
    expect(result.error).toBeDefined();
  });

  it("rejects user not authorized for booking thread", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({ ...fixtures.technicianProfile, userId: "tech-user-1" });
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      customerId: "other-customer",
      technicianId: "tech-profile-1",
    });

    const result = await getOrCreateThread("tech-profile-1", "booking-1");
    expect(result.error).toContain("Not authorized");
  });
});
