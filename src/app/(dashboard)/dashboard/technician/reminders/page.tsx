import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { differenceInCalendarMonths } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RemindersClient, { type ReminderRow, type TemplateRow } from "./RemindersClient";

function pianoLabel(record: {
  pianoMake: string | null;
  pianoModel: string | null;
  pianos: { make: string | null; model: string | null }[];
}): string | null {
  const piano = record.pianos[0];
  const make = piano?.make ?? record.pianoMake;
  const model = piano?.model ?? record.pianoModel;
  const label = [make, model].filter(Boolean).join(" ").trim();
  return label || null;
}

export default async function RemindersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const now = new Date();

  const [dueReminders, upcomingReminders, templates] = await Promise.all([
    prisma.tuneReminder.findMany({
      where: { technicianId: profile.id, sent: false, dueDate: { lte: now } },
      include: { customerRecord: { include: { pianos: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.tuneReminder.findMany({
      where: { technicianId: profile.id, sent: false, dueDate: { gt: now } },
      include: { customerRecord: { include: { pianos: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.messageTemplate.findMany({ where: { technicianId: profile.id } }),
  ]);

  const toRow = (r: (typeof dueReminders)[number]): ReminderRow => ({
    id: r.id,
    reminderType: r.reminderType,
    dueDate: r.dueDate.toISOString(),
    lastTuningDate: r.lastTuningDate.toISOString(),
    customerName: r.customerRecord.customerName,
    pianoLabel: pianoLabel(r.customerRecord),
    monthsOverdue: Math.max(0, differenceInCalendarMonths(now, r.dueDate)),
  });

  const toTemplateRow = (type: "RECALL" | "APPT_REMINDER"): TemplateRow | null => {
    const t = templates.find((tpl) => tpl.type === type);
    if (!t) return null;
    return { subject: t.subject, body: t.body, sendOffsetHours: t.sendOffsetHours };
  };

  return (
    <RemindersClient
      reminderMode={profile.reminderMode}
      dueReminders={dueReminders.map(toRow)}
      upcomingReminders={upcomingReminders.map(toRow)}
      recallTemplate={toTemplateRow("RECALL")}
      apptTemplate={toTemplateRow("APPT_REMINDER")}
    />
  );
}
