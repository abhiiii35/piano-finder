import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));

import { getToken } from "next-auth/jwt";
import { proxy } from "../proxy";

function req(path: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { host: "localhost:3000" },
  });
}

describe("proxy suspension enforcement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects a suspended user hitting a public/non-dashboard page", async () => {
    vi.mocked(getToken).mockResolvedValue({ suspended: true } as never);

    const response = await proxy(req("/technicians/abc"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/sign-in?error=suspended"
    );
  });

  it("redirects a suspended user hitting an api route", async () => {
    vi.mocked(getToken).mockResolvedValue({ suspended: true } as never);

    const response = await proxy(req("/api/messages/thread-1"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/sign-in?error=suspended"
    );
  });

  it("lets a suspended user reach /sign-in without looping", async () => {
    vi.mocked(getToken).mockResolvedValue({ suspended: true } as never);

    const response = await proxy(req("/sign-in"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets an anonymous visitor through on a public path", async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const response = await proxy(req("/technicians/abc"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects a suspended user out of /dashboard", async () => {
    vi.mocked(getToken).mockResolvedValue({ suspended: true } as never);

    const response = await proxy(req("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/sign-in?error=suspended"
    );
  });
});
