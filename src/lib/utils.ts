import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortId(id: string | number) {
  const s = String(id);
  return (s.length > 12 ? s.slice(0, 8) + "…" : s).toUpperCase();
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) return isoDate;
  
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
}
