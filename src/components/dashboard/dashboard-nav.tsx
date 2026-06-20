import type { IconName } from "@/components/ui/icon"

export type DashboardNavItem = {
  href: string
  label: string
  /** Custom icon name from /public/icons (see `IconName`). */
  icon: IconName
}

// Homei dashboard nav. Contractors and homeowners both have an authenticated
// dashboard (docs/HOMEI_PLATFORM.md §5). "Jobs" is the contractor's single
// unified board (new leads → won jobs); Leads + Projects were merged into it.
export const CONTRACTOR_NAV: DashboardNavItem[] = [
  { href: "/contractor", label: "Dashboard", icon: "category" },
  { href: "/contractor/jobs", label: "Jobs", icon: "work" },
  { href: "/contractor/contacts", label: "Contacts", icon: "user-3" },
  { href: "/contractor/messages", label: "Messages", icon: "chat" },
  { href: "/contractor/storm-alerts", label: "Storm alerts", icon: "danger-triangle" },
  { href: "/contractor/reviews", label: "Reviews", icon: "star" },
  { href: "/contractor/reputation", label: "Reputation", icon: "chart" },
  { href: "/contractor/profile", label: "Profile", icon: "profile" },
  { href: "/contractor/settings", label: "Settings", icon: "setting" },
]

export const HOMEOWNER_NAV: DashboardNavItem[] = [
  { href: "/homeowner", label: "Dashboard", icon: "category" },
  // The homeowner's single board (mirrors the contractor "Jobs" table). Quotes
  // live inside each job's chat + detail, so there's no separate Quotes page.
  { href: "/homeowner/requests", label: "Jobs", icon: "work" },
  { href: "/homeowner/messages", label: "Messages", icon: "chat" },
  { href: "/homeowner/settings", label: "Settings", icon: "setting" },
]

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "category" },
  { href: "/admin/verification", label: "Verification", icon: "shield-done" },
  { href: "/admin/credits", label: "Credits", icon: "wallet" },
  { href: "/admin/leads", label: "Leads", icon: "discovery" },
  { href: "/admin/contractors", label: "Contractors", icon: "user-3" },
  { href: "/admin/storm-events", label: "Storm events", icon: "danger-triangle" },
  { href: "/admin/disputes", label: "Disputes", icon: "scale" },
  { href: "/admin/quotes", label: "Quotes", icon: "paper" },
  { href: "/admin/jobs", label: "Jobs", icon: "calendar" },
  { href: "/admin/audits", label: "Audit log", icon: "tick-square" },
  { href: "/admin/settings", label: "Settings", icon: "setting" },
]

export function isDashboardNavActive(pathname: string, href: string): boolean {
  const roots = ["/contractor", "/homeowner", "/admin"] as const
  if ((roots as readonly string[]).includes(href)) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
