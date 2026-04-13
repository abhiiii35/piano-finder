import { type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClassName ?? "bg-secondary"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
