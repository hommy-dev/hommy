import type { IconName } from "@/components/ui/icon"

export type DashboardNavItem = {
  href: string
  label: string
  /** Custom icon name from /public/icons (see `IconName`). */
  icon: IconName
}

// Homei contractor CRM lives under /dashboard (see docs/HOMEI_PLATFORM.md §13).
// There is NO homeowner dashboard — homeowners are unauthenticated.
export const CONTRACTOR_NAV: DashboardNavItem[] = [
  { href: "/contractor", label: "Dashboard", icon: "category" },
  { href: "/contractor/leads", label: "Leads", icon: "discovery" },
  { href: "/contractor/contacts", label: "Contacts", icon: "user-3" },
  { href: "/contractor/projects", label: "Projects", icon: "work" },
  { href: "/contractor/messages", label: "Messages", icon: "chat" },
  { href: "/contractor/storm-alerts", label: "Storm alerts", icon: "danger-triangle" },
  { href: "/contractor/reviews", label: "Reviews", icon: "star" },
  { href: "/contractor/profile", label: "Profile", icon: "profile" },
  { href: "/contractor/settings", label: "Settings", icon: "setting" },
]

export const HOMEOWNER_NAV: DashboardNavItem[] = [
  { href: "/homeowner", label: "Dashboard", icon: "category" },
  { href: "/homeowner/requests", label: "My requests", icon: "paper" },
  { href: "/homeowner/quotes", label: "Quotes", icon: "discount" },
  { href: "/homeowner/messages", label: "Messages", icon: "chat" },
  { href: "/homeowner/profile", label: "Profile", icon: "profile" },
]

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "category" },
  { href: "/admin/verification", label: "Verification", icon: "shield-done" },
  { href: "/admin/leads", label: "Leads", icon: "discovery" },
  { href: "/admin/contractors", label: "Contractors", icon: "user-3" },
  { href: "/admin/storm-events", label: "Storm events", icon: "danger-triangle" },
  { href: "/admin/disputes", label: "Disputes", icon: "scale" },
  { href: "/admin/quotes", label: "Quotes", icon: "paper" },
  { href: "/admin/jobs", label: "Jobs", icon: "calendar" },
  { href: "/admin/audits", label: "Audits", icon: "tick-square" },
  { href: "/admin/settings", label: "Settings", icon: "setting" },
]

export function isDashboardNavActive(pathname: string, href: string): boolean {
  const roots = ["/contractor", "/homeowner", "/admin"] as const
  if ((roots as readonly string[]).includes(href)) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
