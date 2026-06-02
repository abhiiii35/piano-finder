import Link from "next/link";
import { PianoLogoMark } from "@/components/ui/piano-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <PianoLogoMark className="h-10 w-10" iconClassName="h-7 w-7" />
        <span className="text-2xl font-bold tracking-tight text-foreground">
          PianoTuner
        </span>
      </Link>
      {children}
    </div>
  );
}
