import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockCustomerSession,
  mockTechnicianSession,
  fixtures,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { createJob, applyToJob, closeJob } from "@/actions/job";

const mockGetSession = vi.mocked(getServerSession);

describe("createJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a job with budget in cents", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.job.create.mockResolvedValue({ id: "new-job" });

    const fd = makeFormData({
      title: "Annual piano tuning - Steinway Model B",
      serviceType: "Tuning",
      description: "Need my Steinway tuned. Last tuned 14 months ago.",
      budget: "200",
      city: "Boston",
      state: "MA",
    });

    const result = await createJob(fd);
    expect(result.success).toBe(true);
    expect(result.jobId).toBe("new-job");

    const call = prismaMock.job.create.mock.calls[0][0];
    expect(call.data.budgetCents).toBe(20000);
    expect(call.data.customerId).toBe("customer-1");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const fd = makeFormData({
      title: "Test",
      serviceType: "Tuning",
      description: "A description that is long enough",
      budget: "100",
      city: "Boston",
      state: "MA",
    });
    const result = await createJob(fd);
    expect(result.error).toContain("sign in");
  });

  it("returns validation error for short description", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const fd = makeFormData({
      title: "Test",
      serviceType: "Tuning",
      description: "short",
      budget: "100",
      city: "Boston",
      state: "MA",
    });
    const result = await createJob(fd);
    expect(result.error).toBeDefined();
  });
});

describe("applyToJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an application for a technician", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.job.findUnique.mockResolvedValue(fixtures.job);
    prismaMock.jobApplication.findFirst.mockResolvedValue(null);
    prismaMock.jobApplication.create.mockResolvedValue({});

    const result = await applyToJob("job-1", "I'm experienced with Steinways.");
    expect(result.success).toBe(true);
    expect(prismaMock.jobApplication.create).toHaveBeenCalledWith({
      data: {
        jobId: "job-1",
        techId: "tech-user-1",
        message: "I'm experienced with Steinways.",
      },
    });
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await applyToJob("job-1");
    expect(result.error).toContain("Only technicians");
  });

  it("rejects application to closed job", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.job.findUnique.mockResolvedValue({ ...fixtures.job, status: "CLOSED" });

    const result = await applyToJob("job-1");
    expect(result.error).toContain("not found or closed");
  });

  it("rejects duplicate application", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.job.findUnique.mockResolvedValue(fixtures.job);
    prismaMock.jobApplication.findFirst.mockResolvedValue(fixtures.jobApplication);

    const result = await applyToJob("job-1");
    expect(result.error).toContain("already applied");
  });

  it("stores null message when not provided", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.job.findUnique.mockResolvedValue(fixtures.job);
    prismaMock.jobApplication.findFirst.mockResolvedValue(null);
    prismaMock.jobApplication.create.mockResolvedValue({});

    await applyToJob("job-1");
    const call = prismaMock.jobApplication.create.mock.calls[0][0];
    expect(call.data.message).toBeNull();
  });
});

describe("closeJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("closes a job owned by the user", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.job.findFirst.mockResolvedValue(fixtures.job);
    prismaMock.job.update.mockResolvedValue({});

    const result = await closeJob("job-1");
    expect(result.success).toBe(true);
    expect(prismaMock.job.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "CLOSED" },
    });
  });

  it("rejects if job not owned by user", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.job.findFirst.mockResolvedValue(null);

    const result = await closeJob("someone-elses-job");
    expect(result.error).toContain("not found");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await closeJob("job-1");
    expect(result.error).toContain("Unauthorized");
  });
});
