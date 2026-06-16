import { redirect } from "next/navigation"

// Leads + Projects were merged into the unified Jobs board. Keep this route as a
// redirect so existing links (emails, notifications, bookmarks) still land well.
export default function LeadsRedirect() {
  redirect("/contractor/jobs")
}
