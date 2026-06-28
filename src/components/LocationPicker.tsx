import { MapPin } from "lucide-react";
import type { LocationCity } from "@/lib/store";

interface Props {
  cities: LocationCity[];
  city: string;
  district: string;
  onChange: (city: string, district: string) => void;
  label?: string;
}

export function LocationPicker({ cities, city, district, onChange, label }: Props) {
  const current = cities.find((c) => c.name === city);
  const districts = current?.districts ?? [];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 text-primary" /> {label ?? "Location"}
      </span>
      <select
        value={city}
        onChange={(e) => onChange(e.target.value, "")}
        className="h-8 rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">Select city…</option>
        {cities.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={district}
        onChange={(e) => onChange(city, e.target.value)}
        disabled={!current}
        className="h-8 rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
      >
        <option value="">{current ? "Select district…" : "—"}</option>
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
