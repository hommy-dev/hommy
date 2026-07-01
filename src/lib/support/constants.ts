// Shared, framework-agnostic constants for Hommy Support. Imported by both server
// (zod validation in actions) and client (composer + admin inbox controls), so
// status/priority/type stay in sync. The DB stores these as free text
// (see support_tickets in src/lib/db/schema.ts).

import type { IconName } from "@/components/ui/icon"

// The single platform "Hommy Support" identity (a real users row, created on
// first thread). All admin/AI replies are sent AS this user, so the channel and
// every platform message show one uniform face + the stored logo avatar.
export const SUPPORT_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
export const SUPPORT_USER_NAME = "Hommy Support"
export const SUPPORT_USER_EMAIL = "support@hommy.online"
export const SUPPORT_LOGO_URL = "/logo/logo.png"

// Message types offered in the composer's chooser. `feature_request` opens the
// structured card; the rest start a categorized plain-text request.
export type SupportMessageType = "feature_request" | "problem" | "billing" | "other"
export const SUPPORT_MESSAGE_TYPES: { key: SupportMessageType; label: string; icon: IconName }[] = [
  { key: "feature_request", label: "Request a feature", icon: "lightbulb" },
  { key: "problem", label: "Report a problem", icon: "danger-circle" },
  { key: "billing", label: "Billing & account", icon: "wallet" },
  { key: "other", label: "Something else", icon: "chat" },
]
export const TYPE_LABEL: Record<SupportMessageType, string> = {
  feature_request: "Feature request",
  problem: "Problem",
  billing: "Billing & account",
  other: "Something else",
}

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_on_user",
  "resolved",
  "closed",
] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_user: "Waiting on user",
  resolved: "Resolved",
  closed: "Closed",
}

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

// Tailwind classes for status pills (admin inbox table + thread header).
export const STATUS_PILL: Record<TicketStatus, string> = {
  open: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  waiting_on_user: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
}
