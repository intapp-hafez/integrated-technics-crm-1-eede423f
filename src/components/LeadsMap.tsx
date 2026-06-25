import { useMemo, useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Lead } from "@/lib/mock-data";
import { fmtMoney, employees as fallbackEmployees } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";

type EmpMini = { name: string; photo?: string };
type OwnerInfo = { name: string; photo?: string; initials: string; count: number };
type CityAgg = { city: string; lat: number; lng: number; count: number; value: number; leads: Lead[]; owners: OwnerInfo[] };

const CITY_COORDS: Record<string, [number, number]> = {
  "Riyadh": [24.7136, 46.6753],
  "Jeddah": [21.4858, 39.1925],
  "Dammam": [26.4207, 50.0888],
  "Khobar": [26.2172, 50.1971],
  "Makkah": [21.3891, 39.8579],
  "Madinah": [24.5247, 39.5692],
  "Cairo": [30.0444, 31.2357],
  "Alexandria": [31.2001, 29.9187],
  "Giza": [30.0131, 31.2089],
  "Hurghada": [27.2579, 33.8116],
  "Luxor": [25.6872, 32.6396],
  "Port Said": [31.2653, 32.3019]
};

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "??";
}

function aggregateOwners(leads: Lead[], lookup: (name: string) => EmpMini | undefined): OwnerInfo[] {
  const m = new Map<string, OwnerInfo>();
  for (const l of leads) {
    const cur = m.get(l.owner);
    if (cur) {
      cur.count += 1;
      if (!cur.photo && (l as any).ownerPhoto) cur.photo = (l as any).ownerPhoto;
    } else {
      const emp = lookup(l.owner);
      m.set(l.owner, { name: l.owner, photo: (l as any).ownerPhoto ?? emp?.photo, initials: initialsOf(l.owner), count: 1 });
    }
  }
  return Array.from(m.values()).sort((a, b) => b.count - a.count);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function ownerStackIcon(owners: OwnerInfo[]) {
  const shown = owners.slice(0, 4);
  const extra = owners.length - shown.length;
  const chips = shown.map((o) => {
    const title = escapeHtml(`${o.name} · ${o.count}`);
    if (o.photo) {
      return `<img src="${o.photo}" alt="${escapeHtml(o.name)}" title="${title}" style="width:22px;height:22px;border-radius:9999px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.25);object-fit:cover;margin-inline-start:-6px;background:#fff" />`;
    }
    return `<span title="${title}" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.25);font-size:10px;font-weight:700;color:#fff;background:oklch(0.706 0.181 49.5);margin-inline-start:-6px;">${escapeHtml(o.initials)}</span>`;
  }).join("");
  const extraChip = extra > 0
    ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.25);font-size:10px;font-weight:700;color:#1f2937;background:#fff;margin-inline-start:-6px;">+${extra}</span>`
    : "";
  const html = `<div style="display:flex;align-items:center;padding-inline-start:6px;pointer-events:none;">${chips}${extraChip}</div>`;
  const width = 6 + shown.length * 16 + (extra > 0 ? 16 : 0) + 12;
  return L.divIcon({ html, className: "owner-stack-icon", iconSize: [width, 26], iconAnchor: [width / 2, -10] });
}


function FitBounds({ points, focus }: { points: [number, number][]; focus: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView(focus, 10, { animate: true });
      return;
    }
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 6);
    } else {
      map.fitBounds(points as any, { padding: [40, 40] });
    }
  }, [map, points, focus]);
  return null;
}

export function LeadsMap({ leads }: { leads: Lead[] }) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const { employees: storeEmployees } = useStoreState();
  const empLookup = useMemo(() => {
    const m = new Map<string, EmpMini>();
    for (const e of fallbackEmployees) m.set(e.name, { name: e.name, photo: e.photo });
    for (const e of storeEmployees as any[]) if (e?.name) m.set(e.name, { name: e.name, photo: e.photo || m.get(e.name)?.photo });
    return (name: string) => m.get(name);
  }, [storeEmployees]);

  const cities = useMemo<CityAgg[]>(() => {
    const map = new Map<string, CityAgg>();
    for (const l of leads) {
      const key = l.city;
      const cur = map.get(key);
      const latLng = CITY_COORDS[key] || [l.lat || 30.0444, l.lng || 31.2357];
      if (cur) {
        cur.count += 1;
        cur.value += l.value;
        cur.leads.push(l);
      } else {
        map.set(key, { city: l.city, lat: latLng[0], lng: latLng[1], count: 1, value: l.value, leads: [l], owners: [] });
      }
    }
    const arr = Array.from(map.values());
    for (const c of arr) c.owners = aggregateOwners(c.leads, empLookup);
    return arr.sort((a, b) => b.count - a.count);
  }, [leads, empLookup]);

  const maxCount = Math.max(...cities.map((c) => c.count), 1);
  const points = cities.map((c) => [c.lat, c.lng] as [number, number]);
  const selected = cities.find((c) => c.city === selectedCity) ?? null;
  const focus = selected ? ([selected.lat, selected.lng] as [number, number]) : null;
  const totalCount = cities.reduce((s, c) => s + c.count, 0);
  const totalValue = cities.reduce((s, c) => s + c.value, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]" style={{ height: 520 }}>
        <MapContainer
          center={[26.8206, 30.8025]}
          zoom={5}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} focus={focus} />
          {cities.map((c) => {
            const r = 10 + (c.count / maxCount) * 22;
            const isSelected = selectedCity === c.city;
            const dim = selectedCity && !isSelected;
            return (
              <CircleMarker
                key={c.city}
                center={[c.lat, c.lng]}
                radius={r}
                eventHandlers={{ click: () => setSelectedCity(isSelected ? null : c.city) }}
                pathOptions={{
                  color: isSelected ? "oklch(0.55 0.22 27)" : "oklch(0.706 0.181 49.5)",
                  fillColor: isSelected ? "oklch(0.65 0.22 27)" : "oklch(0.706 0.181 49.5)",
                  fillOpacity: dim ? 0.15 : isSelected ? 0.7 : 0.55,
                  weight: isSelected ? 3 : 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1} permanent>
                  <span style={{ fontWeight: 700 }}>{c.city}</span> · {c.count}
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.city}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{c.count} leads · {fmtMoney(c.value)}</div>
                    <div style={{ marginTop: 6, fontSize: 11, color: "#444", fontWeight: 600 }}>Owners</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                      {c.owners.map((o) => (
                        <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          {o.photo ? (
                            <img src={o.photo} alt={o.name} style={{ width: 20, height: 20, borderRadius: 9999, objectFit: "cover", border: "1px solid #ddd" }} />
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 9999, background: "oklch(0.706 0.181 49.5)", color: "#fff", fontSize: 9, fontWeight: 700 }}>{o.initials}</span>
                          )}
                          <span style={{ flex: 1 }}>{o.name}</span>
                          <span style={{ fontWeight: 700 }}>{o.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          {cities.map((c) => (
            <Marker
              key={`owners-${c.city}`}
              position={[c.lat, c.lng]}
              icon={ownerStackIcon(c.owners)}
              interactive={false}
            />
          ))}
        </MapContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Leads by City</h3>
          {selectedCity && (
            <button
              onClick={() => setSelectedCity(null)}
              className="rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent"
            >
              Reset
            </button>
          )}
        </div>
        <div className="mt-2 rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
          {selected
            ? <><span className="font-semibold text-foreground">{selected.city}</span> · {selected.count} leads · {fmtMoney(selected.value)}</>
            : <>{totalCount} leads across {cities.length} cities · {fmtMoney(totalValue)}</>}
        </div>
        <div className="mt-3 space-y-2">
          {cities.map((c) => {
            const pct = (c.count / maxCount) * 100;
            const isSelected = selectedCity === c.city;
            return (
              <button
                key={c.city}
                type="button"
                onClick={() => setSelectedCity(isSelected ? null : c.city)}
                className={`w-full rounded-lg border p-3 text-start transition ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-[var(--shadow-brand)]"
                    : "border-border bg-background hover:border-primary/50 hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{c.city}</span>
                  <span className="font-mono text-sm font-bold text-primary">{c.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center">
                    {c.owners.slice(0, 5).map((o, i) => (
                      o.photo ? (
                        <img
                          key={o.name}
                          src={o.photo}
                          alt={o.name}
                          title={`${o.name} · ${o.count}`}
                          className="h-6 w-6 rounded-full border-2 border-card object-cover shadow-sm"
                          style={{ marginInlineStart: i === 0 ? 0 : -8, zIndex: 10 - i }}
                        />
                      ) : (
                        <span
                          key={o.name}
                          title={`${o.name} · ${o.count}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-[9px] font-bold text-primary-foreground shadow-sm"
                          style={{ marginInlineStart: i === 0 ? 0 : -8, zIndex: 10 - i }}
                        >
                          {o.initials}
                        </span>
                      )
                    ))}
                    {c.owners.length > 5 && (
                      <span className="ms-1 text-[10px] font-semibold text-muted-foreground">+{c.owners.length - 5}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtMoney(c.value)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}