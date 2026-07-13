import { cn } from "@/lib/utils";

/** Two-tone (black & white) piano-keys brand glyph. */
export function PianoKeysIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="2.5"
        y="3.5"
        width="19"
        height="17"
        rx="2.5"
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth="1.4"
      />
      <line x1="7" y1="4" x2="7" y2="20" stroke="#0f172a" strokeWidth="0.9" />
      <line x1="12" y1="4" x2="12" y2="20" stroke="#0f172a" strokeWidth="0.9" />
      <line x1="17" y1="4" x2="17" y2="20" stroke="#0f172a" strokeWidth="0.9" />
      <rect x="5.6" y="3.6" width="2.8" height="9" rx="0.7" fill="#0f172a" />
      <rect x="10.6" y="3.6" width="2.8" height="9" rx="0.7" fill="#0f172a" />
      <rect x="15.6" y="3.6" width="2.8" height="9" rx="0.7" fill="#0f172a" />
    </svg>
  );
}

/**
 * Brand logo mark: the piano-keys glyph on a fixed dark tile.
 * The tile color is intentionally NOT a theme token — a two-tone (white + black)
 * glyph needs a stable background to stay legible in both light and dark themes.
 */
export function PianoLogoMark({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-lg bg-[#0f172a]",
        className
      )}
    >
      <PianoKeysIcon className={cn("h-6 w-6", iconClassName)} />
    </span>
  );
}
