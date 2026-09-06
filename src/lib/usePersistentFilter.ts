import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react";

/**
 * A persistent state hook backed by localStorage.
 * Keeps user-selected filter values across page navigations, detail view clicks, and reloads
 * until the user explicitly changes or resets them.
 *
 * If `overrideValue` is supplied (e.g. from URL search params), it takes precedence and updates storage.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  overrideValue?: T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    // If an explicit override is provided and non-empty, use it and update storage
    if (overrideValue !== undefined && overrideValue !== null && overrideValue !== "") {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(key, JSON.stringify(overrideValue));
        } catch {}
      }
      return overrideValue;
    }

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(key);
        if (stored !== null) {
          return JSON.parse(stored) as T;
        }
      } catch {}
    }

    return defaultValue;
  });

  const isFirstMount = useRef(true);

  // Sync to localStorage on state changes
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {}
    }
  }, [key, state]);

  // Sync if override changes after mount (e.g. navigation to new search params)
  useEffect(() => {
    if (overrideValue !== undefined && overrideValue !== null && overrideValue !== "") {
      setState(overrideValue);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(key, JSON.stringify(overrideValue));
        } catch {}
      }
    }
  }, [overrideValue, key]);

  return [state, setState];
}
