"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Music, Search, LayoutDashboard, LogOut, User, Briefcase } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
            <Music className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            PianoTune
          </span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <Search className="h-4 w-4" />
            Find a Tuner
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <Briefcase className="h-4 w-4" />
            Job Board
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-slate-100 text-slate-700 text-sm">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/sign-in">
              <User className="h-5 w-5 text-slate-600 hover:text-slate-900 transition-colors" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
