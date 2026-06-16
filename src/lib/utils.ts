import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortId(id: string | number) {
  const s = String(id);
  return s.length > 12 ? s.slice(0, 8) + "…" : s;
}
