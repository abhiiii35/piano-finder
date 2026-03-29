import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mockCustomerSession, fixtures } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { createReview } from "@/actions/review";

const mockGetSession = vi.mocked(getServerSession);

describe("createReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a review for a completed booking", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      status: "COMPLETED",
      review: null,
    });
    prismaMock.review.create.mockResolvedValue({});

    const result = await createReview({
      bookingId: "booking-1",
      rating: 5,
      comment: "Excellent!",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.review.create).toHaveBeenCalledWith({
      data: {
        bookingId: "booking-1",
        authorId: "customer-1",
        rating: 5,
        comment: "Excellent!",
      },
    });
  });

  it("rejects review for non-completed booking", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue(null); // query filters on COMPLETED

    const result = await createReview({ bookingId: "booking-1", rating: 4 });
    expect(result.error).toContain("not found or not completed");
  });

  it("rejects duplicate review", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      status: "COMPLETED",
      review: fixtures.review,
    });

    const result = await createReview({ bookingId: "booking-1", rating: 3 });
    expect(result.error).toContain("already submitted");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await createReview({ bookingId: "booking-1", rating: 5 });
    expect(result.error).toContain("sign in");
  });

  it("stores null comment when empty", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      status: "COMPLETED",
      review: null,
    });
    prismaMock.review.create.mockResolvedValue({});

    await createReview({ bookingId: "booking-1", rating: 4 });
    const call = prismaMock.review.create.mock.calls[0][0];
    expect(call.data.comment).toBeNull();
  });
});
