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
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClassName ?? "bg-slate-100"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
