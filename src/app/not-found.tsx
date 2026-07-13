import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PianoLogoMark } from "@/components/ui/piano-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <PianoLogoMark className="h-14 w-14" iconClassName="h-9 w-9" />
      <h1 className="mt-4 text-3xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="mt-6">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
