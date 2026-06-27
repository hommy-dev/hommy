// Roofing subtype landing pages (/roofing/[state]/[city]/[subtype]). Each targets
// a distinct high-intent query ("roof repair in Dallas") with its OWN copy + FAQ,
// so they aren't thin duplicates of the city page. `label` must match the values
// stored in services.subtypes / contractor_services.subtypes.

export type RoofingSubtypePage = {
  /** URL segment, e.g. "roof-repair". */
  slug: string
  /** Canonical label as stored in contractor_services.subtypes. */
  label: string
  /** Lowercase noun for inline copy, e.g. "roof repair". */
  noun: string
  /** Heading / title noun, e.g. "Roof Repair". */
  heading: string
  /** Short one-liner for the city-page services grid. */
  blurb: string
  intro: (city: string) => string
  faq: { q: string; a: string }[]
}

export const ROOFING_SUBTYPE_PAGES: RoofingSubtypePage[] = [
  {
    slug: "roof-repair",
    label: "Repair",
    noun: "roof repair",
    heading: "Roof Repair",
    blurb: "Fix leaks, missing shingles, and storm damage before it spreads.",
    intro: (city) =>
      `Got a leak, missing shingles, or flashing damage in ${city}? Compare local, vetted roofers who handle repairs. Most can take a look and quote quickly, and a repair often costs far less than a full replacement.`,
    faq: [
      { q: "How much does roof repair cost?", a: "Minor repairs like a few shingles or sealing flashing are usually modest, while larger leaks or structural damage cost more. Get a few free quotes to compare. There's no obligation." },
      { q: "Should I repair or replace my roof?", a: "If the roof is relatively young and the damage is localized, repair is usually the call. If it's near end-of-life or damaged in many spots, replacement may cost less over time. A roofer can advise after a look." },
      { q: "How fast can a roofer come out?", a: "Many local roofers respond within a day for active leaks. Post your job and choose who reaches out." },
    ],
  },
  {
    slug: "roof-replacement",
    label: "Replacement",
    noun: "roof replacement",
    heading: "Roof Replacement",
    blurb: "Full tear-off and re-roof when repairs no longer make sense.",
    intro: (city) =>
      `Planning a full re-roof in ${city}? Compare licensed roofers for a tear-off and replacement. See their ratings, ask about materials like asphalt, metal, and tile, and get free quotes before you commit.`,
    faq: [
      { q: "How much does a new roof cost?", a: "It depends on size, pitch, and material. Asphalt shingle is the most affordable; metal and tile cost more but last longer. Compare a few quotes to gauge a fair price for your home." },
      { q: "How long does a roof replacement take?", a: "Most residential re-roofs take 1 to 3 days, weather permitting." },
      { q: "When do I need a full replacement?", a: "Widespread granule loss, sagging, repeated leaks, or a roof past ~20 to 25 years usually point to replacement over repeated repairs." },
    ],
  },
  {
    slug: "roof-inspection",
    label: "Inspection",
    noun: "roof inspection",
    heading: "Roof Inspection",
    blurb: "Know the real condition of your roof, and what it needs.",
    intro: (city) =>
      `Want to know the real condition of your roof in ${city}? Local roofers offer inspections for peace of mind, before buying a home, or to document storm damage for an insurance claim.`,
    faq: [
      { q: "How much does a roof inspection cost?", a: "Many roofers offer free inspections, especially when storm damage or a quote may follow. Confirm when you request quotes." },
      { q: "What does an inspection check?", a: "Shingle/material condition, flashing, valleys, ventilation, signs of leaks or storm damage, and remaining lifespan." },
      { q: "How long does it take?", a: "A typical residential inspection takes under an hour." },
    ],
  },
  {
    slug: "storm-damage",
    label: "Storm Damage",
    noun: "storm damage repair",
    heading: "Storm Damage Repair",
    blurb: "Hail and wind damage assessments, often tied to an insurance claim.",
    intro: (city) =>
      `Hit by hail or high winds in ${city}? Compare roofers who specialize in storm damage. Many document the damage and help with the insurance claim, then repair or replace what's needed.`,
    faq: [
      { q: "Does insurance cover storm damage?", a: "Often yes. Hail and wind damage are commonly covered. A roofer can inspect, document the damage, and help you file. Keep the quote and any agreement on the platform." },
      { q: "How soon should I act after a storm?", a: "Sooner is better: temporary leaks worsen, and many policies have claim windows. A quick inspection establishes the damage." },
      { q: "What's the process?", a: "Inspection → documentation → insurance claim → approved repair or replacement. A storm-savvy roofer guides each step." },
    ],
  },
]

const BY_SLUG = new Map(ROOFING_SUBTYPE_PAGES.map((s) => [s.slug, s]))

export function getRoofingSubtypePage(slug: string): RoofingSubtypePage | null {
  return BY_SLUG.get(slug) ?? null
}

/** Canonical label → URL slug (for sitemap rows that come back by label). */
export const SUBTYPE_LABEL_TO_SLUG: Record<string, string> = Object.fromEntries(
  ROOFING_SUBTYPE_PAGES.map((s) => [s.label, s.slug]),
)
