import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "@/lib/format"
import type { DashboardLead } from "@/lib/data/dashboard"

export const URGENCY: Record<
  DashboardLead["urgency"],
  { label: string; className: string }
> = {
  emergency: {
    label: "Emergency",
    className:
      "border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  within_week: {
    label: "This week",
    className:
      "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  within_month: {
    label: "This month",
    className:
      "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  planning: {
    label: "Planning",
    className:
      "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
}

export function LeadCard({ lead }: { lead: DashboardLead }) {
  const urgency = URGENCY[lead.urgency]
  const place = [lead.city, lead.state].filter(Boolean).join(", ")
  const location =
    place && lead.zipCode
      ? `${place} · ${lead.zipCode}`
      : place || lead.zipCode || "—"
  const when = lead.offeredAt ?? lead.createdAt

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {lead.homeownerName ?? "New homeowner"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {lead.serviceName}
            {lead.subtype ? ` · ${lead.subtype}` : ""}
          </p>
        </div>
        <Badge className={urgency.className}>{urgency.label}</Badge>
      </div>
      {lead.notes ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {lead.notes}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{location}</span>
        <span className="shrink-0">{formatDistanceToNow(new Date(when))}</span>
      </div>
    </div>
  )
}
