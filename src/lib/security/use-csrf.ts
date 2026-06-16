import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCsrfToken } from "./csrf.functions";

const KEY = "csrf_bootstrapped_at";

/**
 * Ensures the CSRF cookie is set on app load. Re-fetches every 4h.
 * Call once from a root-level component.
 */
export function useCsrfBootstrap() {
  const fetchToken = useServerFn(getCsrfToken);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const has = document.cookie.includes("x-csrf-token=");
    const last = Number(localStorage.getItem(KEY) ?? 0);
    const stale = Date.now() - last > 4 * 3600_000;
    if (has && !stale) return;
    fetchToken({})
      .then(() => localStorage.setItem(KEY, String(Date.now())))
      .catch(() => { /* ignore */ });
  }, [fetchToken]);
}
