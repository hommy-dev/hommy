// Plain (non-client) module so both the server page and the client dropdown can
// import the actual values. Exporting data from a "use client" file gives the
// server a client-reference proxy instead of the array.

export const RANGE_OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 3 months" },
  { days: 180, label: "Last 6 months" },
  { days: 365, label: "Last year" },
] as const

export const ALLOWED_RANGES: readonly number[] = RANGE_OPTIONS.map((o) => o.days)

export function rangeLabel(days: number): string {
  return RANGE_OPTIONS.find((o) => o.days === days)?.label ?? "Last 30 days"
}
