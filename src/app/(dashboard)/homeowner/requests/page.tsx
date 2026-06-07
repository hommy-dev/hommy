import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import { getHomeownerForUser, getHomeownerLeads } from "@/lib/data/homeowner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const URGENCY_LABEL: Record<string, string> = {
  emergency: "Emergency",
  within_week: "Within a week",
  within_month: "Within a month",
  planning: "Just planning",
}

// status → label + tone. Tones use the design tokens (secondary = lime accent).
const STATUS_META: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-secondary text-secondary-foreground" },
  filled: { label: "In progress", className: "bg-primary/10 text-primary" },
  awarded: { label: "Hired", className: "bg-success/15 text-success" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
}

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export default async function HomeownerRequestsPage() {
  const user = await getRequiredUser("homeowner")
  const ho = await getHomeownerForUser(user.id)
  const requests = ho ? await getHomeownerLeads(ho.id) : []

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="flex items-end justify-between gap-4 lg:gap-[1.111vw]">
        <div>
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">My requests</h1>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            Your posted projects and how many contractors we matched.
          </p>
        </div>
        <Button asChild>
          <Link href="/get-a-quote">New request</Link>
        </Button>
      </header>

      {requests.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl lg:rounded-[1.111vw] border border-dashed border-border text-center">
          <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-semibold">No requests yet</h2>
          <p className="mt-1 lg:mt-[0.278vw] max-w-sm lg:max-w-[26.664vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            Post your first roofing project and start receiving quotes from
            vetted local contractors.
          </p>
          <Button asChild size="lg" className="mt-5 lg:mt-[1.389vw]">
            <Link href="/get-a-quote">Get a quote</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3 lg:space-y-[0.833vw]">
          {requests.map((r) => {
            const status = STATUS_META[r.status] ?? STATUS_META.open
            const where = [r.city, r.state].filter(Boolean).join(", ")
            return (
              <li
                key={r.id}
                className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-5 lg:p-[1.389vw] transition-colors hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-4 lg:gap-[1.111vw]">
                  <div className="min-w-0">
                    <h3 className="font-semibold capitalize">
                      {r.subtype ? r.subtype.replace(/_/g, " ") : r.serviceName}
                    </h3>
                    <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
                      {where || r.zipCode}
                      {" · "}
                      {URGENCY_LABEL[r.urgency] ?? r.urgency}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-4 lg:mt-[1.111vw] flex items-center gap-2 lg:gap-[0.556vw] text-xs lg:text-[0.833vw] text-muted-foreground">
                  <span>Posted {timeAgo(r.createdAt)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {r.matchedCount === 0
                      ? "Matching contractors…"
                      : `${r.matchedCount} contractor${r.matchedCount === 1 ? "" : "s"} matched`}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
