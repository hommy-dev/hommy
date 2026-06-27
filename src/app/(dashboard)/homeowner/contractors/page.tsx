import type { Metadata } from "next"

import { getRequiredUser } from "@/lib/auth/session"
import { getHomeownerForUser, getHomeownerLatestLocation } from "@/lib/data/homeowner"
import { getRoofersDirectory } from "@/lib/data/roofers"
import { RoofersDirectory } from "@/components/roofing/roofers-directory"

export const metadata: Metadata = { title: "Find a roofer" }

// Homeowner-facing contractor directory. Defaults the "near me" filter to where
// the homeowner last posted a job (we don't store a home address — see
// getHomeownerLatestLocation), and the cards open a DIRECT request via
// /get-a-quote?for=<slug>. The location stays editable in the search box.
export default async function HomeownerContractorsPage() {
  const user = await getRequiredUser("homeowner")
  const ho = await getHomeownerForUser(user.id)
  const loc = ho ? await getHomeownerLatestLocation(ho.id) : null

  const near = loc ? { lat: loc.lat, lng: loc.lng } : null
  const placeLabel = loc ? [loc.city, loc.state].filter(Boolean).join(", ") : ""
  const initialNear = loc
    ? { lat: loc.lat, lng: loc.lng, label: placeLabel || "your last job" }
    : null

  const initial = await getRoofersDirectory({ near, page: 0, pageSize: 12 })

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Find a roofer
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          {placeLabel
            ? `Verified, licensed roofers near ${placeLabel}. Reach out to anyone directly.`
            : "Browse verified, licensed roofers and reach out to anyone directly."}
        </p>
      </header>

      <RoofersDirectory
        initialItems={initial.items}
        initialTotal={initial.total}
        initialHasMore={initial.hasMore}
        initialNear={initialNear}
        richSingleColumn
        quoteHref="/get-a-quote"
      />
    </div>
  )
}
