import React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  delta?: number;
  subText?: React.ReactNode;
  icon: LucideIcon;
  accent?: "primary" | "info" | "success" | "warning" | "danger";
}

const iconStyles = {
  primary: "bg-primary/10 text-primary border border-primary/20",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
};

const topAccentBar = {
  primary: "bg-primary",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

export function KpiCard({ label, value, delta, subText, icon: Icon, accent = "primary" }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative flex flex-col justify-between h-full overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-border">
      {/* Subtle top accent line on hover */}
      <div
        className={`absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${topAccentBar[accent]}`}
      />

      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105 ${iconStyles[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <p className="mt-2 font-display text-3xl font-black tracking-tight text-foreground">
          {value}
        </p>
      </div>

      {(typeof delta === "number" || subText) && (
        <div className="mt-4 pt-3 border-t border-border/40">
          {typeof delta === "number" && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                  positive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(delta)}%
              </span>
              <span className="text-muted-foreground font-normal">vs last month</span>
            </div>
          )}
          {subText && (
            <div className="text-xs font-medium text-muted-foreground leading-normal">
              {subText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
