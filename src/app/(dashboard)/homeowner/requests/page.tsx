import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getHomeownerForUser,
  getHomeownerLeads,
  type HomeownerLead,
} from "@/lib/data/homeowner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const URGENCY_LABEL: Record<string, string> = {
  emergency: "Emergency",
  within_week: "Within a week",
  within_month: "Within a month",
  planning: "Just planning",
}

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

// Plain-language "what's happening now" line — the single most useful thing for
// a homeowner watching their request.
function summary(r: HomeownerLead): string {
  if (r.status === "awarded") return "You hired a contractor for this job."
  if (r.status === "closed") return "This request was closed."
  if (r.status === "expired") return "This request expired with no hire."
  if (r.quoteCount > 0)
    return `${r.quoteCount} quote${r.quoteCount === 1 ? "" : "s"} in — review and choose.`
  if (r.interestedCount > 0)
    return `${r.interestedCount} roofer${r.interestedCount === 1 ? " is" : "s are"} interested — quotes coming.`
  if (r.matchedCount > 0)
    return `${r.matchedCount} roofer${r.matchedCount === 1 ? "" : "s"} matched — waiting for them to respond.`
  return "No roofers cover your area yet — we'll alert you the moment one joins."
}

export default async function HomeownerRequestsPage() {
  const user = await getRequiredUser("homeowner")
  const ho = await getHomeownerForUser(user.id)
  const requests = ho ? await getHomeownerLeads(ho.id) : []

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="flex items-end justify-between gap-4 lg:gap-[1.111vw]">
        <div>
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
            My requests
          </h1>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            Your posted projects and how they’re progressing.
          </p>
        </div>
        <Button asChild>
          <Link href="/get-a-quote">New request</Link>
        </Button>
      </header>

      {requests.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl lg:rounded-[1.111vw] border border-dashed border-border text-center">
          <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-semibold">
            No requests yet
          </h2>
          <p className="mt-1 lg:mt-[0.278vw] max-w-sm lg:max-w-[26.664vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            Post your first roofing project and start receiving quotes from
            vetted local contractors.
          </p>
          <Button asChild size="lg" className="mt-5 lg:mt-[1.389vw]">
            <Link href="/get-a-quote">Get a quote</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 lg:gap-[0.833vw] grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((r) => (
            <RequestCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RequestCard({ r }: { r: HomeownerLead }) {
  const status = STATUS_META[r.status] ?? STATUS_META.open
  const where = [r.city, r.state].filter(Boolean).join(", ")
  const noCoverage = r.status === "open" && r.matchedCount === 0

  const steps = [
    { label: "Posted", done: true },
    { label: "Matched", done: r.matchedCount > 0 },
    { label: "Interested", done: r.interestedCount > 0 },
    { label: "Quotes", done: r.quoteCount > 0 },
    { label: "Hired", done: r.status === "awarded" },
  ]

  return (
    <li className="rounded-md lg:rounded-[0.5vw] border border-border bg-card p-5 lg:p-[1.389vw] transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-4 lg:gap-[1.111vw]">
        <div className="min-w-0">
          <h3 className="font-semibold capitalize lg:text-[1.042vw]">
            {r.subtype ? r.subtype.replace(/_/g, " ") : r.serviceName}
          </h3>
          <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            {where || r.zipCode || "Location set"}
            {" · "}
            {URGENCY_LABEL[r.urgency] ?? r.urgency}
            {" · "}
            Posted {timeAgo(r.createdAt)}
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

      {/* Progress stepper — lit steps show how far the request has come. */}
      {!noCoverage ? (
        <div className="mt-4 lg:mt-[1.111vw] flex flex-wrap items-center gap-x-4 lg:gap-x-[1.111vw] gap-y-1.5 lg:gap-y-[0.417vw]">
          {steps.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 lg:gap-[0.417vw]">
              <span
                className={cn(
                  "size-2 lg:size-[0.556vw] rounded-full",
                  s.done ? "bg-primary" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "text-xs lg:text-[0.833vw]",
                  s.done ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <p
        className={cn(
          "mt-3 lg:mt-[0.833vw] text-sm lg:text-[0.903vw]",
          noCoverage ? "text-amber-700 dark:text-amber-400" : "text-foreground/70",
        )}
      >
        {summary(r)}
      </p>
    </li>
  )
}
