import { Icon, type IconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { SCORE_DELTAS, reviewScoreDelta, FAST_ENGAGE_FRACTION } from "@/lib/config/tunables"

// ── Shared content (sourced from the real scoring tunables) ───────────────────
const FAST = SCORE_DELTAS.fast_engagement
const WIN = SCORE_DELTAS.quote_accepted
const REVIEW = reviewScoreDelta(5)
const DECLINE = SCORE_DELTAS.decline_no_reason
const POOR_REVIEW = reviewScoreDelta(1)
const OFF = SCORE_DELTAS.off_platform_flag

type Item = { icon: IconName; title: string; desc: string; points: number }

const EARN: Item[] = [
  {
    icon: "discovery",
    title: "Reply to new leads fast",
    desc: `Engage within the first ${FAST_ENGAGE_FRACTION * 100}% of the response window to earn the speed bonus.`,
    points: FAST,
  },
  {
    icon: "bag",
    title: "Win the job",
    desc: "A homeowner accepts your quote. This is the single biggest lift to your score.",
    points: WIN,
  },
  {
    icon: "star",
    title: "Earn a 5-star review",
    desc: "Finish strong and ask happy homeowners to review you.",
    points: REVIEW,
  },
]

const LOSE: Item[] = [
  {
    icon: "info-square",
    title: "Decline without a reason",
    desc: "Passing on a lead is fine. Just tell us why so the right jobs reach you.",
    points: DECLINE,
  },
  {
    icon: "danger-triangle",
    title: "Let a job end in a bad review",
    desc: `Do great work and follow through. A 1-star review can cost you up to ${signed(POOR_REVIEW)}.`,
    points: POOR_REVIEW,
  },
  {
    icon: "shield-fail",
    title: "Take a deal off-platform",
    desc: "Keep the job on Homei so the win counts. This is the biggest risk to your score.",
    points: OFF,
  },
]

function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return "0"
}

const INTRO =
  "Your score decides how high you rank when a new job goes out. Every lead reaches the top pros by score first, so climbing means more work, sooner."

// ══════════════════════════════════════════════════════════════════════════════
// Variant 1 — Impact bars: teach relative weight at a glance
// ══════════════════════════════════════════════════════════════════════════════
export function ClimbVariantImpact() {
  const earnMax = Math.max(...EARN.map((i) => i.points))
  const loseMax = Math.max(...LOSE.map((i) => Math.abs(i.points)))

  const Row = ({ item, max, tone }: { item: Item; max: number; tone: "earn" | "lose" }) => {
    const pct = Math.round((Math.abs(item.points) / max) * 100)
    return (
      <li className="flex items-start gap-3 lg:gap-[0.833vw]">
        <span className={cn("mt-0.5 flex size-9 lg:size-[2.5vw] shrink-0 items-center justify-center rounded-xl lg:rounded-[0.833vw]", tone === "earn" ? "bg-success-bg text-success" : "bg-destructive-bg text-destructive")}>
          <Icon name={item.icon} className="size-4 lg:size-[1.25vw]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 lg:gap-[0.556vw]">
            <p className="text-sm lg:text-[0.972vw] font-medium text-foreground">{item.title}</p>
            <span className={cn("shrink-0 text-sm lg:text-[0.972vw] font-bold tabular-nums", tone === "earn" ? "text-success" : "text-destructive")}>{signed(item.points)}</span>
          </div>
          <div className="mt-1.5 lg:mt-[0.417vw] h-1.5 lg:h-[0.417vw] w-full overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", tone === "earn" ? "bg-success" : "bg-destructive")} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 lg:mt-[0.417vw] text-xs lg:text-[0.833vw] text-muted-foreground">{item.desc}</p>
        </div>
      </li>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <header className="border-b border-border px-6 lg:px-[1.667vw] py-5 lg:py-[1.389vw]">
        <h3 className="text-base lg:text-[1.111vw] font-semibold">How your score works</h3>
        <p className="mt-1 lg:mt-[0.278vw] max-w-2xl text-sm lg:text-[0.903vw] text-muted-foreground">{INTRO}</p>
      </header>
      <div className="grid gap-8 lg:gap-[2.222vw] p-6 lg:p-[1.667vw] md:grid-cols-2">
        <div>
          <p className="mb-4 lg:mb-[1.111vw] flex items-center gap-1.5 lg:gap-[0.417vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide text-success">
            <Icon name="arrow-up" className="size-3.5 lg:size-[0.972vw]" /> Earn points
          </p>
          <ul className="space-y-5 lg:space-y-[1.389vw]">
            {EARN.map((i) => <Row key={i.title} item={i} max={earnMax} tone="earn" />)}
          </ul>
        </div>
        <div className="md:border-l md:border-border md:pl-8 lg:md:pl-[2.222vw]">
          <p className="mb-4 lg:mb-[1.111vw] flex items-center gap-1.5 lg:gap-[0.417vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide text-destructive">
            <Icon name="arrow-down" className="size-3.5 lg:size-[0.972vw]" /> Lose points
          </p>
          <ul className="space-y-5 lg:space-y-[1.389vw]">
            {LOSE.map((i) => <Row key={i.title} item={i} max={loseMax} tone="lose" />)}
          </ul>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Variant 2 — Do / Avoid cards: a clear good-vs-bad mental model
// ══════════════════════════════════════════════════════════════════════════════
export function HowToClimbCards() {
  const possible = EARN.reduce((s, i) => s + i.points, 0)

  const Card = ({
    label,
    sub,
    icon,
    tone,
    items,
  }: {
    label: string
    sub: string
    icon: IconName
    tone: "earn" | "lose"
    items: Item[]
  }) => (
    <div className={cn("flex flex-col rounded-xl lg:rounded-[0.833vw] border bg-card p-5 lg:p-[1.389vw]", tone === "earn" ? "border-success/30" : "border-destructive/25")}>
      <div className="flex items-center gap-2.5 lg:gap-[0.694vw]">
        <span className={cn("flex size-9 lg:size-[2.5vw] items-center justify-center rounded-xl lg:rounded-[0.833vw]", tone === "earn" ? "bg-success-bg text-success" : "bg-destructive-bg text-destructive")}>
          <Icon name={icon} className="size-4 lg:size-[1.25vw]" />
        </span>
        <div>
          <p className="text-sm lg:text-[0.972vw] font-semibold">{label}</p>
          <p className="text-xs lg:text-[0.833vw] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <ul className="mt-4 lg:mt-[1.111vw] space-y-3 lg:space-y-[0.833vw]">
        {items.map((i) => (
          <li key={i.title} className="flex items-start gap-3 lg:gap-[0.833vw]">
            <span className={cn("mt-0.5 flex size-5 lg:size-[1.389vw] shrink-0 items-center justify-center rounded-full", tone === "earn" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
              <Icon name={tone === "earn" ? "tick" : "close"} className="size-3 lg:size-[0.833vw]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 lg:gap-[0.556vw]">
                <p className="text-sm lg:text-[0.972vw] font-medium text-foreground">{i.title}</p>
                <span className={cn("shrink-0 rounded-full px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-bold tabular-nums", tone === "earn" ? "bg-success-bg text-success" : "bg-destructive-bg text-destructive")}>
                  {signed(i.points)}
                </span>
              </div>
              <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.833vw] text-muted-foreground">{i.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <section className="homei-rise space-y-4 lg:space-y-[1.111vw]">
      <div>
        <h3 className="text-sm lg:text-[0.972vw] font-semibold">How to climb your score</h3>
        <p className="mt-1 lg:mt-[0.278vw] max-w-2xl text-sm lg:text-[0.903vw] text-muted-foreground">{INTRO}</p>
      </div>
      <div className="grid gap-4 lg:gap-[1.111vw] md:grid-cols-2">
        <Card label="Grow your score" sub={`Up to ${signed(possible)} per job`} icon="arrow-up" tone="earn" items={EARN} />
        <Card label="Protect your score" sub="Avoid these" icon="shield-done" tone="lose" items={LOSE} />
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Variant 3 — Journey: teach the platform flow, with score gains along the way
// ══════════════════════════════════════════════════════════════════════════════
type Step = { icon: IconName; title: string; desc: string; points?: number }

const JOURNEY: Step[] = [
  { icon: "discovery", title: "A lead lands", desc: "We match new roofing jobs to your area and send them to you free." },
  { icon: "chat", title: "Engage fast", desc: "Open the conversation quickly to earn the speed bonus.", points: FAST },
  { icon: "paper", title: "Send a quote", desc: "Price the job and send your estimate inside the chat." },
  { icon: "bag", title: "Win the job", desc: "The homeowner accepts. Your biggest score jump.", points: WIN },
  { icon: "star", title: "Finish and get reviewed", desc: "Wrap up the work and a 5-star review lifts you further.", points: REVIEW },
]

export function ClimbVariantJourney() {
  return (
    <section className="overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <header className="px-6 lg:px-[1.667vw] pt-6 lg:pt-[1.667vw]">
        <h3 className="text-base lg:text-[1.111vw] font-semibold">Your path to more work</h3>
        <p className="mt-1 lg:mt-[0.278vw] max-w-2xl text-sm lg:text-[0.903vw] text-muted-foreground">
          {INTRO} Here is how a job flows, and where your score grows along the way.
        </p>
      </header>

      <ol className="px-6 lg:px-[1.667vw] py-6 lg:py-[1.667vw]">
        {JOURNEY.map((s, i) => {
          const last = i === JOURNEY.length - 1
          return (
            <li key={s.title} className="flex gap-4 lg:gap-[1.111vw]">
              <div className="flex flex-col items-center">
                <span className={cn("z-10 flex size-10 lg:size-[2.778vw] shrink-0 items-center justify-center rounded-full", s.points ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  <Icon name={s.icon} className="size-4 lg:size-[1.25vw]" />
                </span>
                {!last ? <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" /> : null}
              </div>
              <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6 lg:pb-[1.667vw]")}>
                <div className="flex items-center gap-2 lg:gap-[0.556vw]">
                  <p className="text-sm lg:text-[0.972vw] font-semibold text-foreground">{s.title}</p>
                  {s.points ? (
                    <span className="rounded-full bg-success-bg px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-bold tabular-nums text-success">
                      {signed(s.points)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.903vw] text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Heads up footer for the penalties */}
      <div className="border-t border-border bg-muted/30 px-6 lg:px-[1.667vw] py-4 lg:py-[1.111vw]">
        <p className="mb-2 lg:mb-[0.556vw] flex items-center gap-1.5 lg:gap-[0.417vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon name="danger-triangle" className="size-3.5 lg:size-[0.972vw]" /> Two things to avoid
        </p>
        <div className="grid gap-2 lg:gap-[0.556vw] sm:grid-cols-2">
          {LOSE.map((i) => (
            <div key={i.title} className="flex items-center gap-2 lg:gap-[0.556vw] text-sm lg:text-[0.903vw]">
              <span className="font-medium text-foreground">{i.title}</span>
              <span className="rounded-full bg-destructive-bg px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-bold tabular-nums text-destructive">
                {signed(i.points)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
