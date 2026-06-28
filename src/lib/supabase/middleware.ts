import { type NextRequest, NextResponse } from "next/server";
import {
  AREA_BYPASS_COOKIE,
  AREA_BYPASS_VALUE,
  GEO_COUNTRY_HEADER,
  isServedCountry,
} from "@/lib/config/service-areas";

const PUBLIC_PATHS = [
  "/",
  "/get-a-quote", // standalone homeowner lead form
  "/coming-soon", // out-of-area homeowner waitlist (geo-gate target)
  "/blog", // public blog: index, posts, and category filters
  "/privacy", // public legal: privacy policy
  "/terms", // public legal: terms of service
  "/contractors", // contractor recruitment landing + /contractors/signup
  "/roofing", // SEO location pages: /roofing, /roofing/[state], /roofing/[state]/[city]
  "/roofers", // SEO contractor profile pages: /roofers/[slug]
  "/review", // tokenized public review submission flow
  "/accept", // tokenized public quote-acceptance flow
  "/claim", // tokenized recruitment claim links (prospect → signup, no session yet)
  "/unsubscribe", // tokenized recruitment email unsubscribe (no session)
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/api/inngest",
  "/og", // dynamic social-share image route (public; crawlers fetch it)
  "/api/geo-debug", // TEMP: echoes Vercel edge geo headers for gate debugging
  "/sandbox", // dev-only component preview
];

// Homeowner lead-funnel paths gated by country. We launch in the US only, so
// homeowners outside the US are redirected to /coming-soon before they fill the
// form. Contractor/auth/marketing routes stay open to everyone.
const GEO_GATED_PATHS = ["/get-a-quote"];

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

  // Country gate (homeowner lead funnel only). Reading the edge geo header is
  // free — no network call, keeping the proxy's zero-latency contract. We FAIL
  // OPEN: if the country is unknown (local dev, missing header) we let the
  // request through rather than wrongly block. A bypass cookie covers a
  // mis-geolocated real customer (or internal testing) who self-attests they're
  // in an operating country.
  if (isGeoGatedPath(pathname)) {
    const bypassed =
      request.cookies.get(AREA_BYPASS_COOKIE)?.value === AREA_BYPASS_VALUE;
    if (!bypassed) {
      const country = request.headers.get(GEO_COUNTRY_HEADER);

      // Block only when the country is KNOWN and not served. When no geo header
      // is present (local dev) we fail open and let them through.
      if (country && !isServedCountry(country)) {
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
