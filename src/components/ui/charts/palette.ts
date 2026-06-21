// Static Tailwind class maps for charts. Class strings must be literal so the
// JIT compiler emits them — never build them dynamically from a token name.

export type ChartColor =
  | "primary"
  | "violet"
  | "orange"
  | "green"
  | "red"
  | "lime"
  | "muted"

export const STROKE: Record<ChartColor, string> = {
  primary: "stroke-primary",
  violet: "stroke-chart-4",
  orange: "stroke-warning",
  green: "stroke-success",
  red: "stroke-destructive",
  lime: "stroke-chart-2",
  muted: "stroke-muted-foreground",
}

export const FILL: Record<ChartColor, string> = {
  primary: "fill-primary",
  violet: "fill-chart-4",
  orange: "fill-warning",
  green: "fill-success",
  red: "fill-destructive",
  lime: "fill-chart-2",
  muted: "fill-muted-foreground",
}

/** Background (for solid bars + legend dots). */
export const BG: Record<ChartColor, string> = {
  primary: "bg-primary",
  violet: "bg-chart-4",
  orange: "bg-warning",
  green: "bg-success",
  red: "bg-destructive",
  lime: "bg-chart-2",
  muted: "bg-muted-foreground",
}

export const TEXT: Record<ChartColor, string> = {
  primary: "text-primary",
  violet: "text-chart-4",
  orange: "text-warning",
  green: "text-success",
  red: "text-destructive",
  lime: "text-chart-2",
  muted: "text-muted-foreground",
}

/** Default categorical order for multi-series charts (donut, stacked bars). */
export const CATEGORICAL: ChartColor[] = ["primary", "violet", "orange", "green", "red"]
