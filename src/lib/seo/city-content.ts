// Data-driven SEO content for city pages. Without this, every /roofing/[state]/[city]
// page is a near-duplicate template (thin content → won't rank). These generators
// weave each city's real signals (name, roofer supply, recent demand, storm
// activity) into a UNIQUE intro + a locally-relevant FAQ — so every operating
// city (DFW + everywhere) gets rich, honest, indexable content automatically,
// with no per-city hand-curation. An admin can still override via cities.intro /
// cities.faq; this is the fallback that makes the long tail rank.
//
// Honesty matters (Google FAQ policy + trust): no invented prices or fake stats —
// answers describe how Hommy actually works and hedge on cost.

export type CityFaqItem = { q: string; a: string }

export type CityContentInput = {
  cityName: string
  stateName: string
  stateCode: string
  /** Verified roofers covering this city (0 = none yet). */
  proCount: number
  /** Homeowners who requested quotes here recently (0 = none). */
  recentRequests: number
  /** True when there's recent storm activity near the city. */
  hasRecentStorm: boolean
}

// Stable per-city seed so phrasing varies between cities but is consistent for a
// given city (deterministic — safe for caching, avoids one templated footprint).
function seedFrom(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

/** A unique, localized intro paragraph for the city hero. */
export function buildCityIntro(input: CityContentInput): string {
  const seed = seedFrom(`${input.cityName}:${input.stateCode}`)
  const opener = pick(
    [
      `Looking for a roofer in ${input.cityName}?`,
      `Need roof work done in ${input.cityName}, ${input.stateCode}?`,
      `Finding a trustworthy roofer in ${input.cityName} shouldn't be a gamble.`,
    ],
    seed,
  )
  const supply =
    input.proCount > 0
      ? `${input.proCount} licensed, insured local roofer${input.proCount === 1 ? "" : "s"} cover ${input.cityName} on Hommy.`
      : `We're adding licensed, insured roofers across ${input.cityName} now.`
  const storm = input.hasRecentStorm
    ? ` After recent storm activity in the area, getting quotes early helps you beat the rush.`
    : ""
  return `${opener} ${supply} Post your job once, compare roofers and ratings, and only hear from the ones you choose — no spam calls, and it's free to post.${storm}`
}

/** A locally-relevant FAQ. Templated per city, but genuine + useful (rich-result safe). */
export function buildCityFaq(input: CityContentInput): CityFaqItem[] {
  const { cityName } = input
  const items: CityFaqItem[] = [
    {
      q: `How do I find a good roofer in ${cityName}?`,
      a: `Post your roofing job on Hommy and we match you with licensed, insured roofers who cover ${cityName}. You compare their profiles, work, and ratings — and only the roofers you choose can reach out, so you're never spam-called by a dozen companies.`,
    },
    {
      q: `Is it free to get roofing quotes in ${cityName}?`,
      a: `Yes — posting your job and receiving quotes is completely free for homeowners, with no obligation to hire. You stay in control of who you talk to.`,
    },
    {
      q: `How fast can I get roofing quotes in ${cityName}?`,
      a: `Most homeowners hear from local roofers within hours of posting${
        input.hasRecentStorm ? `, and after a storm the earlier you post the faster you'll get a response` : ""
      }.`,
    },
    {
      q: `Are the ${cityName} roofers on Hommy licensed and insured?`,
      a: `Hommy verifies roofers — we check licensing and insurance before a company can quote your job — so the roofers reaching out in ${cityName} are vetted.`,
    },
    {
      q: `How much does a new roof or roof repair cost in ${cityName}?`,
      a: `It depends on your roof's size, slope, and materials, plus any storm damage or local code requirements — so there's no single price. The best way to know is to compare a few quotes from local roofers, which is free on Hommy.`,
    },
  ]
  if (input.hasRecentStorm) {
    items.push({
      q: `My roof was damaged in a storm near ${cityName} — what should I do?`,
      a: `Document the damage with photos, then post your job on Hommy and note it's storm damage. We'll match you with local roofers experienced in storm repairs and insurance-claim work.`,
    })
  }
  return items
}
