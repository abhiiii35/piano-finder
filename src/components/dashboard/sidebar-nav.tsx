"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  Wrench,
  Clock,
  CalendarDays,
  Users,
  Star,
  Search,
  ClipboardCheck,
  FileText,
  Wallet,
} from "lucide-react";

const technicianLinks = [
  { href: "/dashboard/technician", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/technician/profile", label: "Profile", icon: User },
  { href: "/dashboard/technician/services", label: "Services", icon: Wrench },
  { href: "/dashboard/technician/availability", label: "Availability", icon: Clock },
  { href: "/dashboard/technician/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/technician/customers", label: "Customers", icon: Users },
  { href: "/dashboard/technician/finances", label: "Finances", icon: Wallet },
  { href: "/dashboard/technician/reviews", label: "Reviews", icon: Star },
];

const customerLinks = [
  { href: "/dashboard/customer", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/customer/bookings", label: "My Bookings", icon: CalendarDays },
  { href: "/search", label: "Find a Tuner", icon: Search },
];

const adminLinks = [
  { href: "/dashboard/admin/submissions", label: "Submissions", icon: ClipboardCheck },
  { href: "/dashboard/admin/posts", label: "Blog Posts", icon: FileText },
];

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const links =
    role === "TECHNICIAN"
      ? technicianLinks
      : role === "ADMIN"
        ? adminLinks
        : customerLinks;

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive =
          link.href === pathname ||
          (link.href !== "/dashboard/technician" &&
            link.href !== "/dashboard/customer" &&
            pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
