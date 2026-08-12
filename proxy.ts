import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PRIMARY_DOMAIN = "www.bookatuner.com";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};

export async function proxy(request: NextRequest) {
  // Redirect non-primary domains to primary
  const host = request.headers.get("host") ?? "";
  if (
    host &&
    host !== PRIMARY_DOMAIN &&
    host !== "localhost:3000" &&
    !host.includes("localhost")
  ) {
    const url = new URL(request.url);
    url.host = PRIMARY_DOMAIN;
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }

  const pathname = request.nextUrl.pathname;

  const token = await getToken({ req: request });

  // Suspended accounts are signed out everywhere, not just the dashboard
  if (
    token?.suspended &&
    !pathname.startsWith("/sign-in") &&
    !pathname.startsWith("/api/auth")
  ) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("error", "suspended");
    return NextResponse.redirect(signInUrl);
  }

  // Only run the remaining auth checks on protected routes
  if (
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/onboarding")
  ) {
    return NextResponse.next();
  }

  if (!token) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect technician-only routes for non-technicians
  if (pathname.startsWith("/dashboard/technician") && token.role !== "TECHNICIAN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect customer-only routes for non-customers
  if (pathname.startsWith("/dashboard/customer") && token.role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect admin-only routes for non-admins
  if (pathname.startsWith("/dashboard/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Onboarding routes require TECHNICIAN role
  if (pathname.startsWith("/onboarding") && token.role !== "TECHNICIAN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
