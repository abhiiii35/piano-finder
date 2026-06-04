"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  LayoutDashboard,
  LogOut,
  User,
  Briefcase,
  Sparkles,
  Wrench,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PianoLogoMark } from "@/components/ui/piano-logo";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hash?: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "/search", label: "Find a Tuner", icon: Search },
  { href: "/#how-it-works", label: "How it works", icon: Sparkles, hash: "how-it-works" },
  {
    href: "/#for-technicians",
    label: "For Piano Technicians",
    icon: Wrench,
    hash: "for-technicians",
  },
  { href: "/jobs", label: "Job Board", icon: Briefcase },
];

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks: NavLink[] =
    session?.user.role === "TECHNICIAN"
      ? [
          ...NAV_LINKS,
          { href: "/dashboard/technician", label: "Dashboard", icon: LayoutDashboard },
        ]
      : NAV_LINKS;

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, link: NavLink) {
    if (link.hash) handleHashNav(e, link.hash);
    setMobileOpen(false);
  }

  // When already on the home page, App Router's <Link href="/#id"> won't scroll
  // (same route). Intercept and smooth-scroll to the section ourselves. On other
  // routes we let <Link> navigate to "/#id" and HomePage scrolls to it on mount.
  function handleHashNav(
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) {
    // Let the browser handle modifier / non-primary clicks (open in new tab, etc.).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (pathname !== "/") return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    // Reflect the section in the URL without dropping query params or clobbering
    // Next.js's own history state (preserve both; push so Back returns here).
    window.history.pushState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}#${id}`
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5"
        >
          <PianoLogoMark className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            PianoTuner
          </span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session?.user.role === "CUSTOMER" && (
            <Link
              href="/sign-up/technician"
              className="hidden rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:block"
            >
              Join as Technician
            </Link>
          )}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-foreground text-sm">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                <div className="px-3 py-2.5">
                  <p className="font-semibold text-foreground">{session.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {session.user.role === "CUSTOMER" && (
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/customer/bookings")}
                    className="px-3 py-2.5 text-sm"
                  >
                    My Bookings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => router.push(
                    session.user.role === "TECHNICIAN"
                      ? "/dashboard/technician"
                      : "/dashboard"
                  )}
                  className="px-3 py-2.5 text-sm"
                >
                  {session.user.role === "TECHNICIAN"
                    ? "Technician Dashboard"
                    : "Dashboard"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-3 py-2.5 text-sm"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/sign-in">
              <User className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <nav className="border-t bg-background px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className="flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {session?.user.role === "CUSTOMER" && (
              <Link
                href="/sign-up/technician"
                onClick={() => setMobileOpen(false)}
                className="mt-1 flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Wrench className="h-4 w-4" />
                Join as Technician
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
