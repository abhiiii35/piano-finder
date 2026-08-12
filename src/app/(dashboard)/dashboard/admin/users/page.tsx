import Link from "next/link";
import { getUsers } from "@/actions/admin";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PENDING", label: "Pending onboarding" },
] as const;

const ROLE_TABS = [
  { value: "", label: "Everyone" },
  { value: "TECHNICIAN", label: "Tuners" },
  { value: "CUSTOMER", label: "Customers" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const { q, role, status } = await searchParams;
  const result = await getUsers({
    q: q || undefined,
    role: (role as "TECHNICIAN" | "CUSTOMER") || undefined,
    status: (status as "ACTIVE" | "SUSPENDED" | "PENDING") || undefined,
  });

  if ("error" in result) {
    return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  const params = (over: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q, role, status, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Look up any tuner or customer account to troubleshoot.
        </p>
      </div>

      <form className="flex gap-2" action="/dashboard/admin/users" method="get">
        {role && <input type="hidden" name="role" value={role} />}
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or email"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex gap-1">
          {ROLE_TABS.map((t) => (
            <Link
              key={t.value}
              href={`/dashboard/admin/users${params({ role: t.value || undefined })}`}
              className={`rounded-lg px-3 py-1.5 ${(role ?? "") === t.value ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.value}
              href={`/dashboard/admin/users${params({ status: t.value || undefined })}`}
              className={`rounded-lg px-3 py-1.5 ${(status ?? "") === t.value ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {result.users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No accounts match this search.
                </td>
              </tr>
            )}
            {result.users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/admin/users/${u.id}`} className="font-medium text-foreground hover:underline">
                    {u.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">{u.role === "TECHNICIAN" ? "Tuner" : "Customer"}</td>
                <td className="px-4 py-3">
                  {u.suspendedAt ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Suspended</span>
                  ) : u.technician && u.technician.onboardingStatus !== "APPROVED" ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Pending onboarding</span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
