import { type NextRequest } from "next/server";
import { handleProxyAuth } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return handleProxyAuth(request);
}

export const config = {
  // `ingest` is the PostHog reverse-proxy path (next.config.ts rewrites) — it
  // must skip auth so analytics requests aren't redirected or session-refreshed.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ingest).*)"],
};
