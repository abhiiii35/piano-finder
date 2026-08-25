import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptSlotButtons } from "@/components/reschedule/accept-slot-buttons";
import { isProposalPending } from "@/lib/validations/reschedule";

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const proposal = await prisma.rescheduleProposal.findUnique({
    where: { token },
    include: {
      booking: {
        include: {
          technician: { include: { user: { select: { name: true } } } },
          services: { include: { service: true } },
        },
      },
    },
  });

  if (!proposal) notFound();

  const { booking } = proposal;
  const technicianName =
    booking.technician.businessName || booking.technician.user.name || "Your technician";
  const slots: string[] = JSON.parse(proposal.slots);
  const isPending = isProposalPending(proposal);

  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="text-2xl font-bold">Pick a New Time</h1>
      <p className="mt-1 text-muted-foreground">
        {technicianName} isn&apos;t able to make your current appointment time and would like to
        find one that works.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a")}</p>
          <p>
            {booking.addressLine1}, {booking.city}, {booking.state} {booking.zipCode}
          </p>
          {booking.services.length > 0 && (
            <p className="text-muted-foreground">
              {booking.services.map((bs) => bs.service.name).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {isPending ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Choose a New Time</CardTitle>
          </CardHeader>
          <CardContent>
            <AcceptSlotButtons token={token} slots={slots} />
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {proposal.status === "ACCEPTED"
              ? "A new time has already been confirmed for this appointment. Check your email for the details."
              : "This scheduling link is no longer active. Please contact your technician for available times."}
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        None of these work?{" "}
        <Link href={`/technicians/${booking.technicianId}/book`} className="underline">
          Pick any available time on {technicianName}&apos;s full schedule
        </Link>
        .
      </p>
    </div>
  );
}
