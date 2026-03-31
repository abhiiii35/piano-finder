import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getPendingSubmissions } from "@/actions/admin";
import { SubmissionCard } from "@/components/admin/submission-card";
import { ClipboardCheck } from "lucide-react";

export default async function AdminSubmissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) redirect("/dashboard");

  const result = await getPendingSubmissions();
  if (result.error) redirect("/dashboard");

  const submissions = result.submissions ?? [];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Technician Submissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and approve technician profiles
        </p>
      </div>

      <div className="mt-8">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ClipboardCheck className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">No pending submissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((profile) => (
              <SubmissionCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
