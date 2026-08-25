import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HistoryPrefsForm } from "@/components/records/history-prefs-form";
import { parseHistoryViewPrefs, parseClientViewPrefs, computeDamppChaserStat } from "@/lib/service-history";

export default async function HistorySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const rows = await prisma.serviceRecord.findMany({
    where: { technicianId: profile.id, pitchOffsetCents: { not: null } },
    select: { pitchOffsetCents: true, piano: { select: { damppChaserInstalled: true } } },
  });
  const damppChaserStat = computeDamppChaserStat(
    rows.map((r) => ({ pitchOffsetCents: r.pitchOffsetCents, damppChaserInstalled: r.piano.damppChaserInstalled }))
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service history settings</h1>
        <p className="mt-1 text-muted-foreground">
          Control how your own timeline looks and what clients see on their dashboard and share page.
        </p>
      </div>

      <HistoryPrefsForm
        initialHistoryPrefs={parseHistoryViewPrefs(profile.historyViewPrefs)}
        initialClientPrefs={parseClientViewPrefs(profile.clientViewPrefs)}
        damppChaserStat={damppChaserStat}
      />
    </div>
  );
}
