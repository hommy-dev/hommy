import { type NextRequest, NextResponse } from "next/server";
import {
  AREA_BYPASS_COOKIE,
  AREA_BYPASS_VALUE,
  GEO_CITY_HEADER,
  GEO_COUNTRY_HEADER,
  GEO_REGION_HEADER,
  isServedLocation,
} from "@/lib/config/service-areas";

const PUBLIC_PATHS = [
  "/",
  "/get-a-quote", // standalone homeowner lead form
  "/thank-you", // post-submission confirmation
  "/coming-soon", // out-of-area homeowner waitlist (geo-gate target)
  "/contractors", // contractor recruitment landing + /contractors/signup
  "/roofing-contractors", // SEO location pages: /roofing-contractors/[city]-[state]
  "/review", // tokenized public review submission flow
  "/accept", // tokenized public quote-acceptance flow
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/api/inngest",
  "/sandbox", // dev-only component preview
];

// Homeowner lead-funnel paths gated by region. We only serve some states at
// launch, so out-of-area homeowners are redirected to /coming-soon before they
// fill the form. Contractor/auth/marketing routes stay open to everyone.
const GEO_GATED_PATHS = ["/get-a-quote", "/thank-you"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isGeoGatedPath(pathname: string): boolean {
  return GEO_GATED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function shouldSkipEntirely(pathname: string): boolean {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|json|txt|xml|webmanifest)$/.test(
      pathname
    )
  ) {
    return true;
  }
  if (pathname.startsWith("/api/webhooks")) return true;
  return false;
}

/**
 * Cookie-only auth gate — intentionally has zero network calls.
 *
 * Rule: proxy.ts checks only that a Supabase session cookie EXISTS.
 * Real JWT validation + DB role checks happen in getRequiredUser() inside layouts.
 * Doing auth work here costs ~900ms per request and defeats streaming.
 */
export function handleProxyAuth(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (shouldSkipEntirely(pathname)) return NextResponse.next();

  // Region gate (homeowner lead funnel only). Reading edge geo headers is free —
  // no network call, keeping the proxy's zero-latency contract. We FAIL OPEN:
  // if the region is unknown (local dev, missing header) we let the request
  // through rather than wrongly block. A bypass cookie covers mis-geolocated
  // real customers who self-attest they're in an operating state.
  if (isGeoGatedPath(pathname)) {
    const bypassed =
      request.cookies.get(AREA_BYPASS_COOKIE)?.value === AREA_BYPASS_VALUE;
    if (!bypassed) {
      const region = request.headers.get(GEO_REGION_HEADER);
      const country = request.headers.get(GEO_COUNTRY_HEADER);
      const cityRaw = request.headers.get(GEO_CITY_HEADER);
      const city = cityRaw ? decodeURIComponent(cityRaw) : null;

      // Block only when the visitor's location is KNOWN and not served. When no
      // geo headers are present (local dev) we fail open and let them through.
      if ((region || city) && !isServedLocation(region, country, city)) {
        return NextResponse.redirect(new URL("/coming-soon", request.url));
      }
    }
  }

  if (isPublicPath(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/webhooks")) return NextResponse.next();

  // Protected path — presence of any Supabase cookie is sufficient here.
  // The layout's getRequiredUser() validates the JWT and enforces role.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  if (!hasSession) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
