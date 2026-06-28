import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { functions } from "@/lib/inngest/functions"

// v4: serve takes an options object, not positional args.
// `serveHost` pins the URL Inngest registers/invokes, so it always uses the
// canonical www host instead of the apex (which 308-redirects). Set
// INNGEST_SERVE_HOST="https://www.hommy.online" in prod; unset = auto-detect.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  ...(process.env.INNGEST_SERVE_HOST ? { serveHost: process.env.INNGEST_SERVE_HOST } : {}),
})