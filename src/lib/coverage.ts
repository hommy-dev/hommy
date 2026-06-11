// Pure display helpers for a coverage area's shape. No server imports — safe to
// use from client components and server pages alike.

export type CoverageShape = {
  areaType: "circle" | "polygon"
  radiusKm: number | null
  polygon: { lat: number; lng: number }[] | null
}

/** Full one-line summary, e.g. "40 km radius" or "Custom area · 86 points". */
export function coverageSummary(a: CoverageShape): string {
  if (a.areaType === "polygon") {
    const n = a.polygon?.length ?? 0
    return n ? `Custom area · ${n} points` : "Custom area"
  }
  return a.radiusKm ? `${Math.round(a.radiusKm)} km radius` : "Coverage area"
}

/** Compact badge, e.g. "40 km" or "Custom". */
export function coverageBadge(a: CoverageShape): string {
  if (a.areaType === "polygon") return "Custom"
  return a.radiusKm ? `${Math.round(a.radiusKm)} km` : "—"
}
