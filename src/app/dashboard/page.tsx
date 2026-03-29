import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/sign-in");
  }

  if (session.user.role === "TECHNICIAN") {
    redirect("/dashboard/technician");
  }

  redirect("/dashboard/customer");
}
