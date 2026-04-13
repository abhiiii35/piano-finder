"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Search, Briefcase, LayoutDashboard, User } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide during booking flow
  if (pathname.match(/^\/technicians\/[^/]+\/book/)) return null;

  const dashboardHref = session
    ? session.user.role === "TECHNICIAN"
      ? "/dashboard/technician"
      : "/dashboard/customer"
    : null;

  const allTabs = [
    ...tabs,
    dashboardHref
      ? { href: dashboardHref, label: "Dashboard", icon: LayoutDashboard }
      : { href: "/sign-in", label: "Sign In", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card sm:hidden">
      <div className="flex justify-around items-center py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {allTabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
