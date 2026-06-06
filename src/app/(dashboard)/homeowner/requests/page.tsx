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
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-sebenta text-2xl font-bold tracking-tight">My requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your posted projects and how many contractors we matched.
          </p>
        </div>
        <Button asChild>
          <Link href="/get-a-quote">New request</Link>
        </Button>
      </header>

      {requests.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
          <h2 className="font-sebenta text-lg font-semibold">No requests yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Post your first roofing project and start receiving quotes from
            vetted local contractors.
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link href="/get-a-quote">Get a quote</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const status = STATUS_META[r.status] ?? STATUS_META.open
            const where = [r.city, r.state].filter(Boolean).join(", ")
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold capitalize">
                      {r.subtype ? r.subtype.replace(/_/g, " ") : r.serviceName}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {where || r.zipCode}
                      {" · "}
                      {URGENCY_LABEL[r.urgency] ?? r.urgency}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
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
