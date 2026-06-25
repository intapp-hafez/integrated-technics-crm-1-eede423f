import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  accent?: "primary" | "info" | "success" | "warning";
}

const accentMap = {
  primary: "bg-primary-soft text-primary",
  info: "bg-blue-50 text-blue-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
};

const bgMap = {
  primary: "bg-primary/5 border-primary/20 hover:bg-primary/10",
  info: "bg-blue-50 border-blue-200 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:border-blue-900/50",
  success: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-900/50",
  warning: "bg-amber-50 border-amber-200 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:border-amber-900/50",
};

export function KpiCard({ label, value, delta, icon: Icon, accent = "primary" }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={`group relative overflow-hidden rounded-xl border p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-lg ${bgMap[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {typeof delta === "number" && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 ${
              positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
      <div className="pointer-events-none absolute -bottom-12 -end-12 h-32 w-32 rounded-full bg-primary/5 transition-all group-hover:bg-primary/10" />
    </div>
  );
}