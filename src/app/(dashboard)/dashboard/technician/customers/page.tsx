import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Piano, Upload } from "lucide-react";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const customers = await prisma.customerRecord.findMany({
    where: { technicianId: profile.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Records</h1>
          <p className="mt-1 text-muted-foreground">
            Track your customers and their pianos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/technician/customers/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </Link>
          <Link href="/dashboard/technician/customers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {customers.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No customer records yet. Add your first customer to start tracking.
          </p>
        ) : (
          customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/dashboard/technician/customers/${customer.id}`}
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Piano className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{customer.customerName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {[
                        customer.customerEmail,
                        customer.pianoMake &&
                          `${customer.pianoMake} ${customer.pianoModel ?? ""}`.trim(),
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
