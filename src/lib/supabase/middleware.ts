import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/for-painters",
  "/how-it-works",
  "/pricing",
  "/blog",
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/join",
  "/trust",
  "/about",
  "/contact",
  "/painters",
  "/post-project", // homeowner wizard — guests complete it and auto-create an account on submit
  "/testimonial", // tokenized public testimonial submission flow
  "/verify-email",
  "/api/inngest",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
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
