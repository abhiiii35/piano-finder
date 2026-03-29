import Link from "next/link";
import { Music } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                <Music className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                PianoTune
              </span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              The operating system for piano technicians.
            </p>
          </div>

          {/* For Customers */}
          <div>
            <h3 className="font-semibold text-slate-900">For Customers</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/search" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  Find a Tuner
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  Post a Job
                </Link>
              </li>
            </ul>
          </div>

          {/* For Technicians */}
          <div>
            <h3 className="font-semibold text-slate-900">For Technicians</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/sign-up" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  Join the Platform
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-slate-900">Resources</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-sm text-slate-500">
                  Piano Technician Guild
                </span>
              </li>
              <li>
                <span className="text-sm text-slate-500">
                  Piano World Forum
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} PianoTune. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
