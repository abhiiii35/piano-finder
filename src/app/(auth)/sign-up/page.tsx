"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/actions/auth";
import { Mail, Lock, ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Default to CUSTOMER — role selection happens after onboarding
    formData.set("role", "CUSTOMER");
    formData.set("name", (formData.get("email") as string).split("@")[0]);

    const result = await signUp(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm border border-border">
      {/* Back link */}
      <Link
        href="/sign-in"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <h1 className="mt-5 text-center text-xl font-bold text-foreground">
        Create your account
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-center text-sm font-medium text-foreground">
            Email
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:border-border focus-within:ring-1 focus-within:ring-ring">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-center text-sm font-medium text-foreground">
            Password
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:border-border focus-within:ring-1 focus-within:ring-ring">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              name="password"
              type="password"
              placeholder="Min. 8 characters"
              minLength={8}
              required
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-center text-sm font-medium text-foreground">
            Confirm Password
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:border-border focus-within:ring-1 focus-within:ring-ring">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              required
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
