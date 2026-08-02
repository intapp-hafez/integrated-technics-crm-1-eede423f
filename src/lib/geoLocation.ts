/** Shared GPS / reverse-geocoding helpers used by attendance pages */

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
  /** true when coordinates came from IP lookup, not real GPS */
  isApproximate?: boolean;
}

export interface GeoAddress {
  city: string;
  district: string;
  street: string;
  /** Full human-readable label for display / storage */
  label: string;
}

/** Wraps navigator.geolocation.getCurrentPosition as a Promise */
export function getCurrentPosition(): Promise<GpsPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  });
}

/**
 * IP-based geolocation fallback via ip-api.com (free, no key required).
 * Returns approximate city-level coordinates when GPS is denied.
 */
export async function getIpPosition(): Promise<GpsPosition | null> {
  try {
    const res = await fetch("https://ip-api.com/json/?fields=lat,lon,city,regionName,status", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success" || !json.lat || !json.lon) return null;
    return {
      lat: json.lat,
      lng: json.lon,
      accuracy: 5000, // city-level accuracy ~5 km
      isApproximate: true,
    };
  } catch {
    return null;
  }
}

/**
 * Calls Nominatim to reverse-geocode a lat/lng.
 * Returns a structured address with city, district, street and a combined label.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const a = (json.address ?? {}) as Record<string, string>;

    const street =
      [a.road, a.house_number].filter(Boolean).join(" ") ||
      a.pedestrian ||
      a.footway ||
      a.path ||
      "";

    const district =
      a.suburb || a.neighbourhood || a.quarter || a.village || a.hamlet || a.borough || "";

    const city =
      a.city || a.town || a.municipality || a.county || a.state_district || a.state || "";

    const label = [street, district, city].filter(Boolean).join(", ") || json.display_name || "";

    return { street, district, city, label };
  } catch {
    return null;
  }
}

/** Returns a short browser + OS string to append to location logs */
export function deviceSummary(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Device";
  return `${browser} · ${os}`;
}

/** Appends device info to a location string (only once) */
export function withDevice(loc: string): string {
  const dev = deviceSummary();
  if (!loc) return `📱 ${dev}`;
  return loc.includes("📱") ? loc : `${loc} · 📱 ${dev}`;
}
