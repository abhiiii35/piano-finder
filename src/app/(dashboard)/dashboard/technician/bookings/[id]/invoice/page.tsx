import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { formatCents } from "@/lib/utils";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!profile) redirect("/dashboard");

  const booking = await prisma.booking.findFirst({
    where: { id, technicianId: profile.id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      services: { include: { service: true } },
      payment: true,
    },
  });

  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-2xl print:max-w-none">
      <style>{`@media print { .no-print { display: none; } }`}</style>

      <div className="no-print mb-6">
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Print Invoice
        </button>
      </div>

      <div className="border rounded-lg p-8 space-y-8">
        <div className="flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoice</h1>
            <p className="text-sm text-muted-foreground">#{booking.id.slice(0, 8)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{profile.businessName || profile.user.name}</p>
            {profile.addressLine1 && <p className="text-sm">{profile.addressLine1}</p>}
            {profile.city && (
              <p className="text-sm">
                {profile.city}, {profile.state} {profile.zipCode}
              </p>
            )}
            <p className="text-sm">{profile.user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Bill To</h3>
            <p className="font-medium">{booking.customer.name}</p>
            <p className="text-sm">{booking.customer.email}</p>
            {booking.customer.phone && (
              <p className="text-sm">{booking.customer.phone}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
            <p className="text-sm">
              Date: {format(new Date(booking.scheduledAt), "MMMM d, yyyy")}
            </p>
            <p className="text-sm">
              Status: {booking.payment?.status === "SUCCEEDED" ? "Paid" : "Unpaid"}
            </p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-medium">Service</th>
              <th className="py-2 text-right font-medium">Duration</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {booking.services.map((bs) => (
              <tr key={bs.id} className="border-b">
                <td className="py-2">{bs.service.name}</td>
                <td className="py-2 text-right">{bs.service.durationMin} min</td>
                <td className="py-2 text-right">{formatCents(bs.priceCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="py-3 text-right font-semibold">
                Total
              </td>
              <td className="py-3 text-right font-semibold">
                {formatCents(booking.totalCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
