import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MapPin, DollarSign, Users } from "lucide-react";
import { formatCents } from "@/lib/utils";
import { JOB_STATUS } from "@/lib/constants";
import { ServiceFilter } from "@/components/jobs/service-filter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  const jobs = await prisma.job.findMany({
    where: {
      status: JOB_STATUS.OPEN,
      ...(params.service && { serviceType: params.service }),
    },
    include: {
      customer: { select: { name: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse service requests from piano owners
          </p>
        </div>
        {session && (
          <Link
            href="/jobs/post"
            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + Post a Job
          </Link>
        )}
      </div>

      {/* Filter */}
      <div className="mt-6">
        <ServiceFilter />
      </div>

      {/* Jobs list */}
      <div className="mt-6 space-y-4">
        {jobs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-medium text-foreground">
              No jobs posted yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back later or post your own service request
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block">
              <div className="rounded-xl border border-border bg-card p-5 pl-6 transition-shadow hover:shadow-md border-l-4 border-l-accent">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">
                      {job.title}
                    </h3>
                    <span className="mt-0.5 inline-block text-xs text-muted-foreground">
                      {job.serviceType}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    {job.status.toLowerCase()}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {job.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.city}, {job.state}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Budget: {formatCents(job.budgetCents)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {job._count.applications} application
                    {job._count.applications !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
