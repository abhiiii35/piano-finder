"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = new FormData(e.currentTarget).get("email") as string;
    await requestPasswordReset(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm border border-border">
      <h1 className="text-xl font-bold text-foreground">Forgot your password?</h1>
      {sent ? (
        <p className="mt-4 text-sm text-muted-foreground">
          If an account exists with that email, we&apos;ve sent a link to choose
          a new password. Check your inbox.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to choose a new one.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-ring">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
