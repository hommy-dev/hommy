import type { Metadata } from "next"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { contractors, services } from "@/lib/db/schema"
import { getOptionalUser } from "@/lib/auth/session"
import { getStormById } from "@/lib/data/storms"
import { GetAQuoteWizard } from "@/components/public/get-a-quote-wizard"

export const metadata: Metadata = {
  title: "Get a Free Roofing Quote",
  description:
    "Tell us about your roof and get matched with licensed, insured local roofers. Free to post, no obligation, no spam calls. You choose who you talk to.",
  alternates: { canonical: "/get-a-quote" },
}

// Post-a-job intake. Works for guests (auto-signup on submit) and for logged-in
// homeowners (contact step is skipped). Subtypes come from the roofing service
// row so they always match what createLead validates against.
export default async function GetAQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ subtype?: string; where?: string; for?: string; storm?: string }>
}) {
  const sp = await searchParams

  const [roofing] = await db
    .select({ subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, "roofing"))
    .limit(1)
  const subtypes = roofing?.subtypes ?? []

  const user = await getOptionalUser()
  const isHomeowner = user?.role === "homeowner"

  // Storm flow: `?storm=<id>` pre-selects Storm Damage + emergency urgency and
  // shows a banner; the lead is attributed to the storm. Unknown ids fall back.
  const storm = sp.storm ? await getStormById(sp.storm) : null
  const stormSubtype = storm && subtypes.includes("Storm Damage") ? "Storm Damage" : ""

  const initialSubtype =
    stormSubtype || (sp.subtype && subtypes.includes(sp.subtype) ? sp.subtype : "")

  // Direct hire: `?for=<slug>` targets one verified contractor. Unknown/unverified
  // slugs are ignored silently — the wizard falls back to the broadcast flow.
  let target: { slug: string; name: string; logoUrl: string | null } | null = null
  if (sp.for) {
    const [c] = await db
      .select({
        slug: contractors.slug,
        companyName: contractors.companyName,
        logoUrl: contractors.logoUrl,
      })
      .from(contractors)
      .where(and(eq(contractors.slug, sp.for), eq(contractors.verificationStatus, "verified")))
      .limit(1)
    if (c?.slug) target = { slug: c.slug, name: c.companyName ?? "this roofer", logoUrl: c.logoUrl }
  }

  return (
    <GetAQuoteWizard
      subtypes={subtypes}
      initialSubtype={initialSubtype}
      initialWhere={sp.where ?? ""}
      initialUrgency={storm ? "emergency" : "within_month"}
      isLoggedInHomeowner={isHomeowner}
      loggedInName={isHomeowner ? user?.fullName ?? null : null}
      target={target}
      stormEventId={storm?.id ?? null}
      stormBanner={storm ? { eventType: storm.eventType, city: storm.city } : null}
    />
  )
}
