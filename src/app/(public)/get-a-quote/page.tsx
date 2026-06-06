import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { services } from "@/lib/db/schema"
import { getOptionalUser } from "@/lib/auth/session"
import { GetAQuoteWizard } from "@/components/public/get-a-quote-wizard"

// Post-a-job intake. Works for guests (auto-signup on submit) and for logged-in
// homeowners (contact step is skipped). Subtypes come from the roofing service
// row so they always match what createLead validates against.
export default async function GetAQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ subtype?: string; where?: string }>
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

  const initialSubtype =
    sp.subtype && subtypes.includes(sp.subtype) ? sp.subtype : ""

  return (
    <GetAQuoteWizard
      subtypes={subtypes}
      initialSubtype={initialSubtype}
      initialWhere={sp.where ?? ""}
      isLoggedInHomeowner={isHomeowner}
      loggedInName={isHomeowner ? user?.fullName ?? null : null}
    />
  )
}
