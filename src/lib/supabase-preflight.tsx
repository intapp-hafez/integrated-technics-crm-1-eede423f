import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseInitError } from "@/integrations/supabase/client";

/**
 * Runtime preflight: verifies @supabase/supabase-js is installed AND the
 * Supabase client can initialize (env vars present). If either check fails,
 * renders a clear error UI instead of crashing the whole app to a white screen.
 */
export function SupabasePreflight({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1. Verify the SDK module is installed and importable.
        const mod = await import("@supabase/supabase-js");
        if (typeof mod.createClient !== "function") {
          throw new Error(
            "'@supabase/supabase-js' loaded but createClient is missing. The package may be corrupted — reinstall it.",
          );
        }
        // 2. Trigger client init and surface any env / config error.
        const initErr = getSupabaseInitError();
        if (initErr) throw initErr;
        setStatus("ok");
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    })();
  }, []);

  if (status === "error" && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-lg rounded-2xl border border-rose-200 bg-card p-6 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="font-display text-lg font-bold text-foreground">
            Supabase is not available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Reconnect Supabase or reinstall the SDK, then reload the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
