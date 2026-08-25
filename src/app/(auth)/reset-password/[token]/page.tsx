"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { resetPassword } from "@/actions/auth";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(
      token,
      formData.get("password") as string,
      formData.get("confirmPassword") as string
    );
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.push("/sign-in?reset=success");
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm border border-border">
      <h1 className="text-xl font-bold text-foreground">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}{" "}
            {error.includes("expired") && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </div>
        )}
        <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-ring">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="New password (8+ characters)"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-ring">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            name="confirmPassword"
            type="password"
            required
            placeholder="Repeat new password"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
