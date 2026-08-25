import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

const EXPORTS = [
  { type: "customers", label: "Customers" },
  { type: "pianos", label: "Pianos" },
  { type: "contacts", label: "Contacts" },
  { type: "locations", label: "Service Locations" },
  { type: "service-history", label: "Service History" },
  { type: "bookings", label: "Bookings" },
] as const;

export default async function ExportPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Export your data</h1>
        <p className="mt-1 text-muted-foreground">
          Your data is yours — download everything anytime.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {EXPORTS.map((e) => (
            <div key={e.type} className="flex items-center justify-between">
              <span className="text-sm">{e.label}</span>
              <a href={`/api/export?type=${e.type}`} download>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Finances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Income, expenses, mileage, and combined-transactions CSVs are on
            the Finances page.
          </p>
          <Link
            href="/dashboard/technician/finances"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            Go to Finances →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
