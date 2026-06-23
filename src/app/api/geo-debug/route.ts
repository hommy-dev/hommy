import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  GEO_CITY_HEADER,
  GEO_COUNTRY_HEADER,
  GEO_REGION_HEADER,
  isServedLocation,
} from "@/lib/config/service-areas";

// TEMPORARY diagnostic — echoes the raw Vercel edge geo headers so we can see
// exactly what location production assigns to a given visitor (e.g. a real
// Bahawalnagar, PK visitor who is wrongly hitting /coming-soon). Remove once the
// service-area gate is fixed. Public (added to PUBLIC_PATHS in middleware.ts).
export const dynamic = "force-dynamic";

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
    wouldBeServed: isServedLocation(region, country, city),
    note: "If wouldBeServed is false, the gate will redirect you to /coming-soon. Compare the decoded city/region to the OPERATING_CITIES / OPERATING_STATES config.",
  });
}
