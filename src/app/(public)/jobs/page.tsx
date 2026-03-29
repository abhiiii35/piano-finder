import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MapPin, DollarSign, Users, ChevronDown } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  const where: Record<string, unknown> = { status: "OPEN" };
  if (params.service) where.serviceType = params.service;

  const jobs = await prisma.job.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse service requests from piano owners
          </p>
        </div>
        {session && (
          <Link
            href="/jobs/post"
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            + Post a Job
          </Link>
        )}
      </div>

      {/* Filter */}
      <div className="mt-6">
        <div className="relative inline-block">
          <form>
            <select
              name="service"
              defaultValue={params.service ?? ""}
              onChange={(e) => {
                const url = e.target.value
                  ? `/jobs?service=${e.target.value}`
                  : "/jobs";
                window.location.href = url;
              }}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">All Services</option>
              <option value="Tuning">Tuning</option>
              <option value="Repair">Repair</option>
              <option value="Regulation">Regulation</option>
              <option value="Voicing">Voicing</option>
              <option value="Appraisal">Appraisal</option>
              <option value="Other">Other</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </form>
        </div>
      </div>

      {/* Jobs list */}
      <div className="mt-6 space-y-4">
        {jobs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-medium text-slate-900">
              No jobs posted yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Check back later or post your own service request
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-5 pl-6 transition-shadow hover:shadow-md border-l-4 border-l-amber-400">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {job.title}
                    </h3>
                    <span className="mt-0.5 inline-block text-xs text-slate-500">
                      {job.serviceType}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                    {job.status.toLowerCase()}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-2">
                  {job.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.city}, {job.state}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Budget: ${(job.budgetCents / 100).toFixed(0)}
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
