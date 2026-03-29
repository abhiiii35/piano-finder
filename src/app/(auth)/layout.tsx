import Link from "next/link";
import { Music } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold">
        <Music className="h-8 w-8" />
        Book A Piano Tuner
      </Link>
      {children}
    </div>
  );
}
