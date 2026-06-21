import type { Metadata } from "next"
import { headers } from "next/headers"
import { GEO_REGION_HEADER, regionLabel } from "@/lib/config/service-areas"
import { ComingSoon } from "@/components/public/coming-soon"

export const metadata: Metadata = {
  title: "Coming soon to your area | Homei",
  description:
    "We're not in your area just yet. Join the waitlist and we'll let you know the moment Homei reaches you.",
  robots: { index: false, follow: true },
}

// Out-of-area homeowners land here from the proxy geo-gate (see
// src/lib/supabase/middleware.ts). We read the detected region to personalize
// the copy; reading headers keeps this page dynamic, which is correct.
export default async function ComingSoonPage() {
  const h = await headers()
  const region = regionLabel(h.get(GEO_REGION_HEADER))

  return <ComingSoon regionLabel={region} />
}
