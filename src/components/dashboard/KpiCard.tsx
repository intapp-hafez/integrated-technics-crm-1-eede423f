import React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  delta?: number;
  subText?: React.ReactNode;
  icon: LucideIcon;
  accent?: "primary" | "info" | "success" | "warning" | "danger" | "purple";
  variant?: "dark" | "light";
}

const darkThemes = {
  primary: {
    card: "bg-gradient-to-br from-[#14161f] via-[#1c1815] to-[#2c1a0e] border-orange-500/35 hover:border-orange-500/70 shadow-[0_4px_24px_-4px_rgba(249,115,22,0.2)]",
    topBar: "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400",
    iconBg: "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-[0_0_16px_rgba(249,115,22,0.25)]",
    label: "text-orange-200/90",
    value: "text-white",
    subText: "text-orange-200/75",
    borderDivider: "border-orange-500/20",
    glow: "bg-orange-500/15",
  },
  info: {
    card: "bg-gradient-to-br from-[#14161f] via-[#141c26] to-[#0c2438] border-sky-500/35 hover:border-sky-500/70 shadow-[0_4px_24px_-4px_rgba(14,165,233,0.2)]",
    topBar: "bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-400",
    iconBg: "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_16px_rgba(14,165,233,0.25)]",
    label: "text-sky-200/90",
    value: "text-white",
    subText: "text-sky-200/75",
    borderDivider: "border-sky-500/20",
    glow: "bg-sky-500/15",
  },
  success: {
    card: "bg-gradient-to-br from-[#14161f] via-[#12221b] to-[#0c2b1c] border-emerald-500/35 hover:border-emerald-500/70 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.2)]",
    topBar: "bg-gradient-to-r from-emerald-500 via-teal-500 to-green-400",
    iconBg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.25)]",
    label: "text-emerald-200/90",
    value: "text-white",
    subText: "text-emerald-200/75",
    borderDivider: "border-emerald-500/20",
    glow: "bg-emerald-500/15",
  },
  purple: {
    card: "bg-gradient-to-br from-[#14161f] via-[#1c1428] to-[#28103a] border-purple-500/35 hover:border-purple-500/70 shadow-[0_4px_24px_-4px_rgba(168,85,247,0.2)]",
    topBar: "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-violet-400",
    iconBg: "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_16px_rgba(168,85,247,0.25)]",
    label: "text-purple-200/90",
    value: "text-white",
    subText: "text-purple-200/75",
    borderDivider: "border-purple-500/20",
    glow: "bg-purple-500/15",
  },
  warning: {
    card: "bg-gradient-to-br from-[#14161f] via-[#201a14] to-[#2d1e0d] border-amber-500/35 hover:border-amber-500/70 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.2)]",
    topBar: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400",
    iconBg: "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.25)]",
    label: "text-amber-200/90",
    value: "text-white",
    subText: "text-amber-200/75",
    borderDivider: "border-amber-500/20",
    glow: "bg-amber-500/15",
  },
  danger: {
    card: "bg-gradient-to-br from-[#14161f] via-[#221316] to-[#300d14] border-rose-500/35 hover:border-rose-500/70 shadow-[0_4px_24px_-4px_rgba(244,63,94,0.2)]",
    topBar: "bg-gradient-to-r from-rose-500 via-pink-500 to-red-400",
    iconBg: "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.25)]",
    label: "text-rose-200/90",
    value: "text-white",
    subText: "text-rose-200/75",
    borderDivider: "border-rose-500/20",
    glow: "bg-rose-500/15",
  },
};

const lightThemes = {
  primary: {
    card: "bg-card border-border/80 hover:border-primary/40",
    topBar: "bg-primary",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    label: "text-muted-foreground",
    value: "text-foreground",
    subText: "text-muted-foreground",
    borderDivider: "border-border/40",
    glow: "bg-primary/5",
  },
  info: {
    card: "bg-card border-border/80 hover:border-sky-500/40",
    topBar: "bg-sky-500",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    label: "text-muted-foreground",
    value: "text-foreground",
    subText: "text-muted-foreground",
    borderDivider: "border-border/40",
    glow: "bg-sky-500/5",
  },
  success: {
    card: "bg-card border-border/80 hover:border-emerald-500/40",
    topBar: "bg-emerald-500",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    label: "text-muted-foreground",
    value: "text-foreground",
    subText: "text-muted-foreground",
    borderDivider: "border-border/40",
    glow: "bg-emerald-500/5",
  },
  purple: {
    card: "bg-card border-border/80 hover:border-purple-500/40",
    topBar: "bg-purple-500",
    iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    label: "text-muted-foreground",
    value: "text-foreground",
    subText: "text-muted-foreground",
    borderDivider: "border-border/40",
    glow: "bg-purple-500/5",
  },
  warning: {
    card: "bg-card border-border/80 hover:border-amber-500/40",
    topBar: "bg-amber-500",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    label: "text-muted-foreground",
    value: "text-foreground",
    subText: "text-muted-foreground",
    borderDivider: "border-border/40",
    glow: "bg-amber-500/5",
  },
  danger: {
    card: "bg-card border-border/80 hover:border-rose-500/40",
    topBar: "bg-rose-500",
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    label: "text-muted-foreground",
    value: "text-foreground",
    subText: "text-muted-foreground",
    borderDivider: "border-border/40",
    glow: "bg-rose-500/5",
  },
};

export function KpiCard({
  label,
  value,
  delta,
  subText,
  icon: Icon,
  accent = "primary",
  variant = "dark",
}: Props) {
  const theme = variant === "dark" ? darkThemes[accent] : lightThemes[accent];
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className={`group relative flex flex-col justify-between h-full overflow-hidden rounded-2xl border p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${theme.card}`}
    >
      {/* Top accent bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 opacity-90 transition-opacity duration-200 group-hover:opacity-100 ${theme.topBar}`}
      />

      {/* Ambient background glow */}
      <div
        className={`pointer-events-none absolute -bottom-10 -end-10 h-32 w-32 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-60 ${theme.glow}`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-xs font-bold uppercase tracking-wider ${theme.label}`}>
            {label}
          </p>
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <p className={`mt-2.5 font-display text-3xl sm:text-4xl font-black tracking-tight ${theme.value}`}>
          {value}
        </p>
      </div>

      {(typeof delta === "number" || subText) && (
        <div className={`relative z-10 mt-4 pt-3 border-t ${theme.borderDivider}`}>
          {typeof delta === "number" && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                  positive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(delta)}%
              </span>
              <span className={`${variant === "dark" ? "text-slate-400" : "text-muted-foreground"} font-normal`}>
                vs last month
              </span>
            </div>
          )}
          {subText && (
            <div className={`text-xs font-medium leading-normal ${theme.subText}`}>
              {subText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
