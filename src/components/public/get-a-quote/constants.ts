import type { IconType } from "@/components/ui/option-card"
import { NOT_SURE_SUBTYPE } from "@/lib/leads/subtype"

export type StepKey = "what" | "where" | "you"
export type FieldErrors = Record<string, string>

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const STEP_LABELS: Record<StepKey, string> = {
  what: "Your roof",
  where: "Location",
  you: "Your details",
}

// Urgency options, presented as time-icon cards so it reads as picking a
// timeframe. `value` matches the createLead urgency enum.
export const URGENCY = [
  {
    value: "emergency",
    label: "Emergency",
    desc: "Need someone now",
    icon: "alarm",
  },
  {
    value: "within_week",
    label: "Within a week",
    desc: "As soon as possible",
    icon: "time-circle",
  },
  {
    value: "within_month",
    label: "Within a month",
    desc: "No big rush",
    icon: "calendar",
  },
  {
    value: "planning",
    label: "Just planning",
    desc: "Getting prices",
    icon: "lightbulb",
  },
] as const satisfies ReadonlyArray<{
  value: string
  label: string
  desc: string
  icon: IconType
}>

// Icon + one-line helper per subtype, so the choices read as real options, not
// filter tags. Keyed by the service's subtype labels; unknown labels fall back
// to a neutral icon and no description.
export const SUBTYPE_META: Record<string, { icon: IconType; desc: string }> = {
  Repair: {
    icon: "wrench",
    desc: "A leak, missing shingles, or a specific problem.",
  },
  Replacement: {
    icon: "swap",
    desc: "Replace all or a large section of the roof.",
  },
  Inspection: {
    icon: "search",
    desc: "Have a roofer assess the roof's condition.",
  },
  "Storm Damage": {
    icon: "storm",
    desc: "Damage from wind, hail, or a recent storm.",
  },
  [NOT_SURE_SUBTYPE]: {
    icon: "info-square",
    desc: "Not sure what's wrong, a roofer will take a look.",
  },
}
