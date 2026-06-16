import { formatDistanceToNow } from "@/lib/format"
import type { DashboardLead } from "@/lib/data/dashboard"
import { cn } from "@/lib/utils"
import { SlaCountdown } from "./sla-countdown"

export const URGENCY: Record<
  DashboardLead["urgency"],
  { label: string; pill: string; accent: string }
> = {
  emergency: {
    label: "Emergency",
    pill: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    accent: "bg-red-500",
  },
  within_week: {
    label: "This week",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    accent: "bg-amber-500",
  },
  within_month: {
    label: "This month",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    accent: "bg-blue-500",
  },
  planning: {
    label: "Planning",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    accent: "bg-slate-400",
  },
}

const STATUS: Record<
  DashboardLead["recipientStatus"],
  { label: string; className: string }
> = {
  offered: { label: "New", className: "bg-secondary text-secondary-foreground" },
  viewed: { label: "Viewed", className: "bg-muted text-foreground/70" },
  engaged: { label: "Engaged", className: "bg-success/15 text-success" },
  won: { label: "Won", className: "bg-success text-success-foreground" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  lost: { label: "Lost", className: "bg-muted text-muted-foreground" },
}

export function LeadCard({ lead }: { lead: DashboardLead }) {
  const urgency = URGENCY[lead.urgency]
  const status = STATUS[lead.recipientStatus]
  const place = [lead.city, lead.state].filter(Boolean).join(", ")
  const location = place || lead.zipCode || "Location hidden"
  const when = lead.offeredAt ?? lead.createdAt

  // The SLA clock only matters while the offer is still actionable.
  const showSla =
    lead.slaDeadline != null &&
    lead.leadStatus === "open" &&
    (lead.recipientStatus === "offered" || lead.recipientStatus === "viewed")

  // Engagement is uncapped — a lead only locks once it's awarded to someone.
  const locked = lead.leadStatus === "awarded"

  return (
    <article className="relative overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card transition-colors hover:border-foreground/25">
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1 lg:w-[0.278vw]", urgency.accent)}
      />

      <div className="p-4 lg:p-[1.111vw] pl-5 lg:pl-[1.528vw]">
        <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
          <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
            <span
              className={cn(
                "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
                status.className,
              )}
            >
              {status.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
                urgency.pill,
              )}
            >
              {urgency.label}
            </span>
          </div>
          {showSla ? (
            <SlaCountdown
              deadline={lead.slaDeadline!}
              className="text-xs lg:text-[0.833vw]"
            />
          ) : null}
        </div>

        <div className="mt-3 lg:mt-[0.833vw] flex items-start justify-between gap-3 lg:gap-[0.833vw]">
          <div className="min-w-0">
            <p className="truncate font-semibold lg:text-[1.042vw]">
              {lead.homeownerName ?? "New homeowner"}
            </p>
            <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.903vw] text-muted-foreground">
              {lead.serviceName}
            </p>
          </div>
          {lead.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lead.photoUrl}
              alt=""
              className="size-14 lg:size-[3.889vw] shrink-0 rounded-md lg:rounded-[0.556vw] border border-border object-cover"
            />
          ) : null}
        </div>

        {lead.subtypes.length > 0 ? (
          <div className="mt-2.5 lg:mt-[0.694vw] flex flex-wrap gap-1.5 lg:gap-[0.417vw]">
            {lead.subtypes.map((s) => (
              <span
                key={s}
                className="rounded-md lg:rounded-[0.417vw] bg-muted px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium text-foreground/75"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}

        {lead.notes ? (
          <p className="mt-2.5 lg:mt-[0.694vw] line-clamp-2 text-sm lg:text-[0.903vw] text-foreground/70">
            {lead.notes}
          </p>
        ) : null}

        <div className="mt-3 lg:mt-[0.833vw] flex items-center justify-between gap-2 lg:gap-[0.556vw] border-t border-border pt-3 lg:pt-[0.833vw] text-xs lg:text-[0.833vw] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 lg:gap-[0.417vw]">
            <span className="truncate">{location}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">{formatDistanceToNow(new Date(when))}</span>
          </span>
          <span className="shrink-0 font-medium text-foreground/80">
            {locked
              ? "Awarded"
              : `${lead.engagementCreditCost} credit${lead.engagementCreditCost === 1 ? "" : "s"} to chat`}
          </span>
        </div>
      </div>
    </article>
  )
}
