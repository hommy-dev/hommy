import { redirect } from "next/navigation"

// Profile + verification folded into the Settings hub.
export default function ContractorProfileRedirect() {
  redirect("/contractor/settings/company")
}
