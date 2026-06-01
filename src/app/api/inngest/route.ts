import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { functions } from "@/lib/inngest/functions"

// v4: serve takes an options object, not positional args
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})