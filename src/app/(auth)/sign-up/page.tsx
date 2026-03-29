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
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
      {/* Back link */}
      <Link
        href="/sign-in"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <h1 className="mt-5 text-center text-xl font-bold text-slate-900">
        Create your account
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-center text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-center text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300">
            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              name="password"
              type="password"
              placeholder="Min. 8 characters"
              minLength={8}
              required
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-center text-sm font-medium text-slate-700">
            Confirm Password
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300">
            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              required
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
