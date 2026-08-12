import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/actions/admin";
import { UserActions } from "@/components/admin/user-actions";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getUserDetail(id);
  if ("error" in result) {
    if (result.error === "User not found") notFound();
    return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  const { user, bookings, reviews } = result;
  const isTechnician = Boolean(user.role === "TECHNICIAN" && user.technician);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/admin/users" className="text-sm text-muted-foreground hover:underline">
          ← All users
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{user.name ?? "Unnamed account"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-secondary px-2 py-0.5">
                {user.role === "TECHNICIAN" ? "Tuner" : "Customer"}
              </span>
              <span className={`rounded-full px-2 py-0.5 ${user.emailVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"}`}>
                {user.emailVerified ? "Email verified" : "Email not verified"}
              </span>
              {user.suspendedAt && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                  Suspended {new Date(user.suspendedAt).toLocaleDateString()}
                </span>
              )}
              {isTechnician && (
                <span className="rounded-full bg-secondary px-2 py-0.5">
                  Onboarding: {user.technician!.onboardingStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <UserActions
        userId={user.id}
        suspended={Boolean(user.suspendedAt)}
        emailVerified={Boolean(user.emailVerified)}
        isTechnician={isTechnician}
      />

      {isTechnician && (
        <>
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Services</h2>
            {user.technician!.services.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No services set up.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {user.technician!.services.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">${(s.priceCents / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Availability</h2>
            {user.technician!.availabilitySlots.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No availability set.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {user.technician!.availabilitySlots.map((slot) => (
                  <li key={slot.id} className="flex justify-between">
                    <span>{WEEKDAYS[slot.dayOfWeek]}</span>
                    <span className="text-muted-foreground">{slot.startTime}–{slot.endTime}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Recent bookings</h2>
        {bookings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span>
                  {new Date(b.scheduledAt).toLocaleDateString()} ·{" "}
                  {isTechnician ? (b.customer.name ?? b.customer.email) : (b.technician.user.name ?? "Tuner")}
                </span>
                <span className="text-muted-foreground">
                  {b.status} · ${(b.totalCents / 100).toFixed(2)}
                  {b.payment ? ` · payment ${b.payment.status}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">
          {isTechnician ? "Reviews received" : "Reviews written"}
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No reviews.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-border pb-2 last:border-0">
                <span className="font-medium">{r.rating}/5</span>
                {"author" in r && r.author ? (
                  <span className="text-muted-foreground"> — {(r.author as { name: string | null }).name ?? "Customer"}</span>
                ) : null}
                {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
