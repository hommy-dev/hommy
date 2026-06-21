// Sample coverage / lead-origin data for the map previews. Real version will
// come from service_areas (lat/lng) + recent leads (lat/lng). Spread out here
// so the arcs read well in the sandbox; real single-metro data will cluster.

export type GeoPoint = { name: string; lng: number; lat: number; leads?: number }

export const HUB: GeoPoint = { name: "Lone Star Roofing Co.", lng: -96.797, lat: 32.7767 }

export const ORIGINS: GeoPoint[] = [
  { name: "Houston, TX", lng: -95.3698, lat: 29.7604, leads: 6 },
  { name: "Fort Worth, TX", lng: -97.3308, lat: 32.7555, leads: 5 },
  { name: "Austin, TX", lng: -97.7431, lat: 30.2672, leads: 4 },
  { name: "San Antonio, TX", lng: -98.4936, lat: 29.4241, leads: 3 },
  { name: "Oklahoma City, OK", lng: -97.5164, lat: 35.4676, leads: 2 },
  { name: "Shreveport, LA", lng: -93.7502, lat: 32.5252, leads: 2 },
  { name: "El Paso, TX", lng: -106.485, lat: 31.7619, leads: 1 },
]
