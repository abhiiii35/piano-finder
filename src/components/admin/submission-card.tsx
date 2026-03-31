"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveSubmission, rejectSubmission } from "@/actions/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
};

type Props = {
  profile: {
    id: string;
    bio: string | null;
    businessName: string | null;
    yearsExperience: number | null;
    city: string | null;
    state: string | null;
    ptgMember: boolean;
    user: { name: string | null; email: string | null };
    services: Service[];
  };
};

export function SubmissionCard({ profile }: Props) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    const result = await approveSubmission(profile.id);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Approved ${profile.user.name}`);
      router.refresh();
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setLoading(true);
    const result = await rejectSubmission(profile.id, reason);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Rejected ${profile.user.name}`);
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{profile.user.name}</h3>
          <p className="text-sm text-slate-500">{profile.user.email}</p>
        </div>
        {profile.ptgMember && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            PTG Member
          </span>
        )}
      </div>

      <dl className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <dt className="text-slate-500">Location</dt>
          <dd className="text-slate-900">{profile.city}, {profile.state}</dd>
        </div>
        {profile.businessName && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Business</dt>
            <dd className="text-slate-900">{profile.businessName}</dd>
          </div>
        )}
        {profile.yearsExperience != null && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Experience</dt>
            <dd className="text-slate-900">{profile.yearsExperience} years</dd>
          </div>
        )}
      </dl>

      {profile.bio && (
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-1">Bio</p>
          <p className="text-sm text-slate-900">{profile.bio}</p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-slate-500 mb-2">Services ({profile.services.length})</p>
        <div className="flex flex-wrap gap-2">
          {profile.services.map((svc) => (
            <span key={svc.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {svc.name} — ${(svc.priceCents / 100).toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      {showReject ? (
        <div className="space-y-3">
          <Textarea
            placeholder="Explain what changes are needed..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={loading} className="flex-1">
              {loading ? "Rejecting..." : "Send Rejection"}
            </Button>
            <Button variant="outline" onClick={() => setShowReject(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={loading} className="flex-1">
            {loading ? "Approving..." : "Approve"}
          </Button>
          <Button variant="outline" onClick={() => setShowReject(true)} disabled={loading}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
