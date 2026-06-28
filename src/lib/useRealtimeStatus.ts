import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RealtimeStatus = "connected" | "connecting" | "disconnected" | "reconnecting" | "error";

interface RealtimeState {
  status: RealtimeStatus;
  lastConnectedAt: Date | null;
  lastError: string | null;
}

export function useRealtimeStatus() {
  const [state, setState] = useState<RealtimeState>({
    status: "connecting",
    lastConnectedAt: null,
    lastError: null,
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      setState((prev) => ({
        ...prev,
        status: prev.status === "disconnected" ? "reconnecting" : "connecting",
        lastError: null,
      }));

      const channel = supabase.channel("realtime-status");
      channelRef.current = channel;

      channel
        .on("system", {}, (payload: any) => {
          // Listen for system events if needed
          if (payload?.type === "error") {
            setState((prev) => ({
              ...prev,
              status: "error",
              lastError: payload?.message ?? "Realtime error",
            }));
          }
        })
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            reconnectAttemptRef.current = 0;
            setState({
              status: "connected",
              lastConnectedAt: new Date(),
              lastError: null,
            });
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            const errorMsg =
              err?.message ??
              (status === "TIMED_OUT" ? "Connection timed out" : `Channel ${status}`);
            setState((prev) => ({
              ...prev,
              status: "disconnected",
              lastError: errorMsg,
            }));

            // Auto-reconnect with exponential backoff (max 10s)
            reconnectAttemptRef.current += 1;
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptRef.current - 1), 10000);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (status === "SUBSCRIBING") {
            setState((prev) => ({
              ...prev,
              status: prev.status === "disconnected" ? "reconnecting" : "connecting",
            }));
          }
        });
    };

    connect();

    // Also listen to the browser online/offline events
    const handleOnline = () => {
      reconnectAttemptRef.current = 0;
      connect();
    };
    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        status: "disconnected",
        lastError: "Network offline",
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return state;
}
