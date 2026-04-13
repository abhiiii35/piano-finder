import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ONBOARDING_STATUS } from "@/lib/constants";
import { SubmitForm } from "./submit-form";

export default async function SubmitPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      services: { where: { isActive: true } },
      availabilitySlots: true,
    },
  });

  if (!profile) redirect("/sign-up/technician");

  const allowed = [ONBOARDING_STATUS.CHECKLIST_PENDING, ONBOARDING_STATUS.REJECTED];
  if (!allowed.includes(profile.onboardingStatus)) redirect("/dashboard/technician");

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Review & Submit</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Review your profile below. Once submitted, an admin will review it.
      </p>

      {profile.rejectionReason && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-900">Previous feedback</p>
          <p className="mt-1 text-sm text-red-700">{profile.rejectionReason}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold text-foreground mb-3">Profile</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground">{profile.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="text-foreground">{profile.city}, {profile.state}</dd>
            </div>
            {profile.businessName && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Business</dt>
                <dd className="text-foreground">{profile.businessName}</dd>
              </div>
            )}
            {profile.yearsExperience != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Experience</dt>
                <dd className="text-foreground">{profile.yearsExperience} years</dd>
              </div>
            )}
            {profile.bio && (
              <div>
                <dt className="text-muted-foreground mb-1">Bio</dt>
                <dd className="text-foreground">{profile.bio}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold text-foreground mb-3">Services ({profile.services.length})</h3>
          {profile.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services added yet.</p>
          ) : (
            <ul className="space-y-2">
              {profile.services.map((svc) => (
                <li key={svc.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{svc.name}</span>
                  <span className="text-muted-foreground">${(svc.priceCents / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold text-foreground mb-3">Availability</h3>
          {profile.availabilitySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No availability set (you can add this later).</p>
          ) : (
            <ul className="space-y-1">
              {profile.availabilitySlots
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((slot) => (
                  <li key={slot.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{dayNames[slot.dayOfWeek]}</span>
                    <span className="text-muted-foreground">{slot.startTime} - {slot.endTime}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <SubmitForm />
      </div>
    </div>
  );
}
