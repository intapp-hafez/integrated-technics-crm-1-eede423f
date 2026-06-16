// Defensive Supabase client. Initialization is lazy and never throws at
// import time — errors are captured and surfaced by <SupabasePreflight />.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let _supabase: SupabaseClient<Database> | undefined;
let _initError: Error | undefined;

export function getSupabaseInitError(): Error | undefined {
  // Trigger init once if not already attempted.
  if (!_supabase && !_initError) {
    try {
      _supabase = createSupabaseClient();
    } catch (e) {
      _initError = e instanceof Error ? e : new Error(String(e));
    }
  }
  return _initError;
}

function createSupabaseClient(): SupabaseClient<Database> {
  if (typeof createClient !== 'function') {
    throw new Error(
      "Supabase SDK missing: '@supabase/supabase-js' is not installed or failed to load. Run `bun add @supabase/supabase-js`."
    );
  }
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(', ')}.`
    );
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    if (!_supabase) {
      try {
        _supabase = createSupabaseClient();
      } catch (e) {
        _initError = e instanceof Error ? e : new Error(String(e));
        console.error('[Supabase]', _initError.message);
        throw _initError;
      }
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});
