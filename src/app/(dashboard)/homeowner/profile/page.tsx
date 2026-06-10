import { redirect } from "next/navigation"

// Profile folded into the Settings hub.
export default function HomeownerProfileRedirect() {
  redirect("/homeowner/settings/account")
}
