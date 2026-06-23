import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  GEO_COUNTRY_HEADER,
  GEO_REGION_HEADER,
  isServedCountry,
} from "@/lib/config/service-areas";

// TEMPORARY diagnostic — echoes the raw Vercel edge geo headers so we can see
// exactly what location production assigns to a given visitor. The lead funnel
// now gates by COUNTRY only (US), so `wouldBeServed` reflects that. Remove once
// no longer needed. Public (added to PUBLIC_PATHS in middleware.ts).
// No route segment config — reading headers() already makes this dynamic, and
// `export const dynamic` is incompatible with cacheComponents.
const GEO_CITY_HEADER = "x-vercel-ip-city";

export async function GET() {
  const h = await headers();
  const region = h.get(GEO_REGION_HEADER);
  const country = h.get(GEO_COUNTRY_HEADER);
  const cityRaw = h.get(GEO_CITY_HEADER);
  const city = cityRaw ? decodeURIComponent(cityRaw) : null;

  return NextResponse.json({
    raw: {
      [GEO_REGION_HEADER]: region,
      [GEO_COUNTRY_HEADER]: country,
      [`${GEO_CITY_HEADER} (raw)`]: cityRaw,
      [`${GEO_CITY_HEADER} (decoded)`]: city,
    },
    decoded: { region, country, city },
    wouldBeServed: isServedCountry(country),
    note: "Gate is country-only now: wouldBeServed is true iff country is in OPERATING_COUNTRIES (US). If false, the lead funnel redirects to /coming-soon.",
  });
}
