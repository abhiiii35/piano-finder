import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearch } from "@/components/dashboard/global-search";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:px-6 sm:pb-8 lg:px-8">
        {session.user.role === "TECHNICIAN" && (
          <div className="mb-6 flex justify-end">
            <GlobalSearch />
          </div>
        )}
        {children}
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
