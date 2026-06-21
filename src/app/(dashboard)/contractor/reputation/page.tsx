import { redirect } from "next/navigation"

// Reputation merged into Analytics. Keep the route alive for old links/bookmarks.
export default function ContractorReputationPage() {
  redirect("/contractor/analytics")
}
