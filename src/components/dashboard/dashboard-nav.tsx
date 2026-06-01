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
  Home03Icon,
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

export const CONTRACTOR_NAV: DashboardNavItem[] = [
  { href: "/contractor", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/contractor/leads", label: "Leads", icon: Target02Icon },
  { href: "/contractor/jobs", label: "Jobs", icon: Briefcase01Icon },
  { href: "/contractor/messages", label: "Messages", icon: Chat01Icon },
  { href: "/contractor/profile", label: "Profile", icon: User02Icon },
  { href: "/contractor/settings", label: "Settings", icon: Settings01Icon },
]

export const HOMEOWNER_NAV: DashboardNavItem[] = [
  { href: "/homeowner", label: "My projects", icon: Home03Icon },
  { href: "/homeowner/jobs", label: "Jobs", icon: Briefcase01Icon },
  { href: "/homeowner/messages", label: "Messages", icon: Chat01Icon },
]

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/admin/verification", label: "Verification", icon: UserCheck01Icon },
  { href: "/admin/disputes", label: "Disputes", icon: BalanceScaleIcon },
  { href: "/admin/incidents", label: "Incidents", icon: AlertCircleIcon },
  { href: "/admin/site-visits", label: "Site visits", icon: CheckListIcon },
  { href: "/admin/quotes", label: "Quotes", icon: Note02Icon },
  { href: "/admin/users", label: "Users", icon: UserGroupIcon },
  { href: "/admin/jobs", label: "Jobs", icon: Calendar03Icon },
  { href: "/admin/settings", label: "Settings", icon: Settings01Icon },
]

export function isDashboardNavActive(pathname: string, href: string): boolean {
  const roots = ["/contractor", "/homeowner", "/admin"] as const
  if ((roots as readonly string[]).includes(href)) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
