import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { useRealtimeStatus } from "@/lib/useRealtimeStatus";
import { useI18n } from "@/lib/i18n";

export function RealtimeStatus() {
  const { status, lastConnectedAt, lastError } = useRealtimeStatus();
  const { t } = useI18n();

  const config = {
    connected: {
      icon: Wifi,
      color: "bg-emerald-500",
      ring: "ring-emerald-500/40",
      pulse: true,
      spin: false,
      label: t("realtimeConnected"),
    },
    connecting: {
      icon: RefreshCw,
      color: "bg-amber-500",
      ring: "ring-amber-500/40",
      pulse: false,
      spin: true,
      label: t("realtimeConnecting"),
    },
    reconnecting: {
      icon: RefreshCw,
      color: "bg-amber-500",
      ring: "ring-amber-500/40",
      pulse: false,
      spin: true,
      label: t("realtimeReconnecting"),
    },
    disconnected: {
      icon: WifiOff,
      color: "bg-rose-500",
      ring: "ring-rose-500/40",
      pulse: false,
      spin: false,
      label: t("realtimeDisconnected"),
    },
    error: {
      icon: AlertCircle,
      color: "bg-rose-500",
      ring: "ring-rose-500/40",
      pulse: false,
      spin: false,
      label: t("realtimeError"),
    },
  };

  const c = config[status];
  const Icon = c.icon;

  const tooltip = [
    c.label,
    lastError ? `Error: ${lastError}` : undefined,
    lastConnectedAt ? `Last connected: ${lastConnectedAt.toLocaleTimeString()}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className="group relative flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1"
      title={tooltip}
    >
      <span
        className={`relative flex h-2.5 w-2.5 rounded-full ${c.color} ${c.pulse ? "animate-pulse" : ""} ${c.ring ? `ring-2 ${c.ring}` : ""}`}
      >
        {c.pulse && (
          <span
            className={`absolute inset-0 inline-flex h-full w-full animate-ping rounded-full ${c.color} opacity-40`}
          />
        )}
      </span>
      <Icon
        className={`h-3.5 w-3.5 text-muted-foreground ${c.spin ? "animate-spin" : ""}`}
      />
      <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
        {c.label}
      </span>

      {/* Mobile tooltip */}
      <div className="pointer-events-none absolute bottom-full mb-2 start-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:hidden">
        {c.label}
      </div>
    </div>
  );
}
