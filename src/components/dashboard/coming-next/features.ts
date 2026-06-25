import type { IconName } from "@/components/ui/icon"

// Roadmap features shown on /contractor/coming-next. `key` is the stable slug
// stored in feature_interest.feature_key (the upvote/notify ledger) — never
// rename a key once shipped or you orphan its votes. Order here is the display
// order in the grid. Keep names service-neutral (no roofing hard-binding).

export type FeatureStatus = "in-progress" | "next-up" | "exploring"

export type FeatureDef = {
  key: string
  title: string
  description: string
  status: FeatureStatus
  /** Tailwind hue used for the card's tint + accents. */
  accent: "indigo" | "amber" | "sky" | "emerald" | "rose"
  /** Nav/label glyph (also the scene fallback). */
  icon: IconName
  /** Whether the card shows the notify/upvote control. The teaser card doesn't. */
  votable: boolean
}

export const FEATURES: FeatureDef[] = [
  {
    key: "ai-assistant",
    title: "AI that runs the back office",
    description:
      "An assistant that replies to new leads, schedules your crews, and drafts quotes for you, around the clock.",
    status: "next-up",
    accent: "indigo",
    icon: "lightbulb",
    votable: true,
  },
  {
    key: "storm-detection",
    title: "Storm detection",
    description:
      "Automatic hail and wind alerts mapped to your service areas, with the affected homes ready to reach out to.",
    status: "next-up",
    accent: "amber",
    icon: "storm",
    votable: true,
  },
  {
    key: "crew-management",
    title: "Crew management",
    description:
      "Assign leads and jobs to crews, see who is on what, and plan the week without a spreadsheet.",
    status: "next-up",
    accent: "emerald",
    icon: "user-3",
    votable: true,
  },
  {
    key: "integrations",
    title: "More integrations",
    description:
      "Connect the tools you already use, like QuickBooks, CompanyCam and Zapier, so everything stays in sync.",
    status: "in-progress",
    accent: "sky",
    icon: "globe",
    votable: true,
  },
  {
    key: "social-media",
    title: "Social media manager",
    description:
      "Schedule posts, gather reviews, and keep your Google and social profiles fresh without lifting a finger.",
    status: "exploring",
    accent: "rose",
    icon: "heart",
    votable: true,
  },
  {
    key: "more",
    title: "Share us what you need",
    description:
      "We are building Hommy with you. The features you vote for are the ones we build first.",
    status: "exploring",
    accent: "indigo",
    icon: "more-circle",
    votable: false,
  },
]

export const FEATURE_KEYS = FEATURES.map((f) => f.key)

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  "in-progress": "In progress",
  "next-up": "Next up",
  exploring: "Exploring",
}
