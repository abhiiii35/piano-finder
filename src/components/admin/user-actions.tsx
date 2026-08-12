"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  suspendUser,
  reactivateUser,
  adminResendVerification,
  adminSendPasswordReset,
} from "@/actions/admin";

export function UserActions({
  userId,
  suspended,
  emailVerified,
  isTechnician,
}: {
  userId: string;
  suspended: boolean;
  emailVerified: boolean;
  isTechnician: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  async function run(action: () => Promise<{ error?: string; success?: boolean }>, okText: string) {
    setLoading(true);
    const result = await action();
    setLoading(false);
    setConfirmSuspend(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(okText);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {suspended ? (
          <button
            disabled={loading}
            onClick={() => run(() => reactivateUser(userId), "Account reactivated.")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Reactivate account
          </button>
        ) : (
          <button
            disabled={loading}
            onClick={() => setConfirmSuspend(true)}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            Suspend account
          </button>
        )}
        {!emailVerified && (
          <button
            disabled={loading}
            onClick={() => run(() => adminResendVerification(userId), "Verification email sent.")}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Resend verification email
          </button>
        )}
        <button
          disabled={loading}
          onClick={() => run(() => adminSendPasswordReset(userId), "Password reset email sent.")}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Send password reset
        </button>
      </div>

      {confirmSuspend && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <p className="text-red-700">
            {isTechnician
              ? "This tuner will disappear from search and won't be able to log in until reactivated. Their bookings and messages are kept."
              : "This customer won't be able to log in until reactivated. Their bookings and reviews are kept."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={loading}
              onClick={() => run(() => suspendUser(userId), "Account suspended.")}
              className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
            >
              Yes, suspend
            </button>
            <button
              disabled={loading}
              onClick={() => setConfirmSuspend(false)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
