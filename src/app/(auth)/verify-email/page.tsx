import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  let status: "success" | "expired" | "invalid" = "invalid";

  if (token && email) {
    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token } },
    });

    if (record) {
      if (record.expires > new Date()) {
        // Valid token — verify the user
        await prisma.user.update({
          where: { email },
          data: { emailVerified: new Date() },
        });
        await prisma.verificationToken.delete({
          where: { identifier_token: { identifier: email, token } },
        });
        status = "success";
      } else {
        // Expired token
        await prisma.verificationToken.delete({
          where: { identifier_token: { identifier: email, token } },
        });
        status = "expired";
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      {status === "success" && (
        <>
          <div className="rounded-full bg-green-100 p-4">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Email Verified</h1>
          <p className="text-muted-foreground">
            Your email has been verified successfully. You can now sign in.
          </p>
        </>
      )}

      {status === "expired" && (
        <>
          <div className="rounded-full bg-yellow-100 p-4">
            <svg
              className="h-8 w-8 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Link Expired</h1>
          <p className="text-muted-foreground">
            This verification link has expired. Please request a new one.
          </p>
        </>
      )}

      {status === "invalid" && (
        <>
          <div className="rounded-full bg-red-100 p-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Invalid or Expired Link</h1>
          <p className="text-muted-foreground">
            This verification link is invalid or has already been used.
          </p>
        </>
      )}

      <Link
        href="/sign-in"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Sign In
      </Link>
    </div>
  );
}
