import type { ComponentProps } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  BalanceScaleIcon,
  Briefcase01Icon,
  Calendar03Icon,
  CheckListIcon,
  Chat01Icon,
  DashboardSquare01Icon,
  Note02Icon,
  Settings01Icon,
  Target02Icon,
  User02Icon,
  UserCheck01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"

type Hugeicon = NonNullable<ComponentProps<typeof HugeiconsIcon>["icon"]>

export type DashboardNavItem = {
  href: string
  label: string
  icon: Hugeicon
}

// Homei contractor CRM lives under /dashboard (see docs/HOMEI_PLATFORM.md §13).
// There is NO homeowner dashboard — homeowners are unauthenticated.
export const CONTRACTOR_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/dashboard/leads", label: "Leads", icon: Target02Icon },
  { href: "/dashboard/contacts", label: "Contacts", icon: UserGroupIcon },
  { href: "/dashboard/projects", label: "Projects", icon: Briefcase01Icon },
  { href: "/dashboard/messages", label: "Messages", icon: Chat01Icon },
  { href: "/dashboard/storm-alerts", label: "Storm alerts", icon: AlertCircleIcon },
  { href: "/dashboard/reviews", label: "Reviews", icon: Note02Icon },
  { href: "/dashboard/profile", label: "Profile", icon: User02Icon },
  { href: "/dashboard/settings", label: "Settings", icon: Settings01Icon },
]

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/admin/verification", label: "Verification", icon: UserCheck01Icon },
  { href: "/admin/leads", label: "Leads", icon: Target02Icon },
  { href: "/admin/contractors", label: "Contractors", icon: UserGroupIcon },
  { href: "/admin/storm-events", label: "Storm events", icon: AlertCircleIcon },
  { href: "/admin/disputes", label: "Disputes", icon: BalanceScaleIcon },
  { href: "/admin/quotes", label: "Quotes", icon: Note02Icon },
  { href: "/admin/jobs", label: "Jobs", icon: Calendar03Icon },
  { href: "/admin/audits", label: "Audits", icon: CheckListIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings01Icon },
]

export function isDashboardNavActive(pathname: string, href: string): boolean {
  const roots = ["/dashboard", "/admin"] as const
  if ((roots as readonly string[]).includes(href)) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
