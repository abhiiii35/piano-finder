"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Mail, Lock, Key } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
      {/* Logo */}
      <div className="flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
          <Music className="h-7 w-7 text-white" />
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500">
            <Key className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">
          Welcome to PianoTune
        </h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400">OR</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-sm">
        <button type="button" className="text-slate-500 hover:text-slate-700">
          Forgot password?
        </button>
        <span className="text-slate-500">
          Need an account?{" "}
          <Link href="/sign-up" className="font-medium text-slate-900 hover:underline">
            Sign up
          </Link>
        </span>
      </div>
    </div>
  );
}
