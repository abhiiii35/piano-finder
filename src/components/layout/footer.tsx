import Link from "next/link";
import { Music } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Music className="h-5 w-5" />
            Book A Piano Tuner
          </Link>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Book A Piano Tuner. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
