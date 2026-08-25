import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mockTechnicianSession, mockCustomerSession, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Render logic for the PDF document itself is covered at the component level
// (see invoice-pdf.test.ts pattern); this route is tested for auth/authz and
// year validation, so the actual PDF renderer is stubbed out.
vi.mock("@react-pdf/renderer", () => ({
  Document: (props: { children?: unknown }) => props.children,
  Page: (props: { children?: unknown }) => props.children,
  View: (props: { children?: unknown }) => props.children,
  Text: (props: { children?: unknown }) => props.children,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
}));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/finances/tax-summary/route";

const mockGetSession = vi.mocked(getServerSession);

function request(year?: string) {
  const qs = year !== undefined ? `?year=${year}` : "";
  return new Request(`http://localhost/api/finances/tax-summary${qs}`);
}

describe("GET /api/finances/tax-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([]);
    prismaMock.mileageLog.findMany.mockResolvedValue([]);
  });

  it("returns 401 for non-technicians", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const response = await GET(request("2026"));
    expect(response.status).toBe(401);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await GET(request("2026"));
    expect(response.status).toBe(401);
  });

  it("returns 404 when the technician has no profile", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    const response = await GET(request("2026"));
    expect(response.status).toBe(404);
  });

  it("rejects a missing year", async () => {
    const response = await GET(request());
    expect(response.status).toBe(400);
  });

  it("rejects a non-integer year", async () => {
    const response = await GET(request("2026.5"));
    expect(response.status).toBe(400);
  });

  it("rejects a non-numeric year", async () => {
    const response = await GET(request("abc"));
    expect(response.status).toBe(400);
  });

  it("rejects an out-of-range year", async () => {
    const response = await GET(request("1899"));
    expect(response.status).toBe(400);
  });

  it("returns a PDF for a valid year", async () => {
    const response = await GET(request("2026"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      "tax-summary-2026.pdf"
    );
  });
});
