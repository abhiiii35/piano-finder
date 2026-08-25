import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImportWizard } from "@/components/import/import-wizard";

export default async function ImportCustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Import Customers</h1>
      <p className="mt-1 text-muted-foreground">
        Bring in customers from a spreadsheet, a vCard export, or Google Contacts.
      </p>
      <div className="mt-8">
        <ImportWizard googleEnabled={googleEnabled} />
      </div>
    </div>
  );
}
