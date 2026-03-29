import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: ["/dashboard/:path*"],
};

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const pathname = request.nextUrl.pathname;

  // Redirect technician-only routes for non-technicians
  if (pathname.startsWith("/dashboard/technician") && token.role !== "TECHNICIAN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect customer-only routes for non-customers
  if (pathname.startsWith("/dashboard/customer") && token.role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
