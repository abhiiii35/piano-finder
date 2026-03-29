import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ApplyButton } from "@/components/jobs/apply-button";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      applications: {
        include: { technician: { select: { name: true } } },
      },
    },
  });

  if (!job) notFound();

  const hasApplied = session
    ? job.applications.some((a) => a.techId === session.user.id)
    : false;
  const isOwner = session?.user.id === job.customerId;
  const isTechnician = session?.user.role === "TECHNICIAN";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.city}, {job.state}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Budget: ${(job.budgetCents / 100).toFixed(0)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(job.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <Badge
          className={
            job.status === "OPEN"
              ? "bg-amber-500 text-white"
              : "bg-slate-200 text-slate-600"
          }
        >
          {job.status.toLowerCase()}
        </Badge>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
            {job.description}
          </p>
          <div className="mt-4">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {job.serviceType}
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Posted by {job.customer.name ?? "Anonymous"}
          </p>
        </CardContent>
      </Card>

      {/* Apply section for technicians */}
      {isTechnician && job.status === "OPEN" && !isOwner && (
        <div className="mt-6">
          <ApplyButton jobId={job.id} hasApplied={hasApplied} />
        </div>
      )}

      {/* Applications (visible to job owner) */}
      {isOwner && job.applications.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Applications ({job.applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.applications.map((app) => (
              <div
                key={app.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <p className="font-medium text-sm text-slate-900">
                  {app.technician.name}
                </p>
                {app.message && (
                  <p className="mt-1 text-sm text-slate-500">{app.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Applied {format(new Date(app.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
