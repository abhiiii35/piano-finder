import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { services: { where: { isActive: true } } },
  });

  if (!profile) redirect("/sign-up/technician");
  if (profile.onboardingStatus !== "WIZARD_PENDING") redirect("/dashboard/technician");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">Complete Your Profile</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Just a few more details before you can start receiving bookings.
      </p>
      <OnboardingWizard
        profile={{
          bio: profile.bio,
          businessName: profile.businessName,
          yearsExperience: profile.yearsExperience,
        }}
        services={profile.services}
      />
    </div>
  );
}
