"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, LayoutDashboard, LogOut, User, Briefcase, Sparkles, Wrench } from "lucide-react";
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

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

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
        <Link href="/" className="flex items-center gap-2.5">
          <PianoLogoMark className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            PianoTuner
          </span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            Find a Tuner
          </Link>
          <Link
            href="/#how-it-works"
            onClick={(e) => handleHashNav(e, "how-it-works")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles className="h-4 w-4" />
            How it works
          </Link>
          <Link
            href="/#for-technicians"
            onClick={(e) => handleHashNav(e, "for-technicians")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Wrench className="h-4 w-4" />
            For Piano Technicians
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Briefcase className="h-4 w-4" />
            Job Board
          </Link>
          {session?.user.role === "TECHNICIAN" && (
            <Link
              href="/dashboard/technician"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}
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
        </div>
      </div>
    </header>
  );
}
