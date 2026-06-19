import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getMembershipRole,
  getServiceAreas,
  getContractorSubtypes,
} from "@/lib/data/dashboard"
import { getPortfolio } from "@/lib/data/portfolio"
import { getContractorReviews } from "@/lib/data/reviews"
import { coverageBadge } from "@/lib/coverage"
import { ServiceTag } from "@/components/ui/service-tag"
import { getVerificationState } from "@/lib/contractor/verification"
import { PortfolioGallery } from "@/components/dashboard/portfolio/portfolio-gallery"
import { ReviewsSummaryCard } from "@/components/dashboard/reviews/reviews-summary"
import { ReviewList } from "@/components/dashboard/reviews/review-list"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return "?"
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export default async function ContractorProfilePage() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const [role, subtypes, areas, portfolio, reviews] = await Promise.all([
    getMembershipRole(user.id, c.id),
    getContractorSubtypes(c.id),
    getServiceAreas(c.id),
    getPortfolio(c.id, { publishedOnly: true }),
    getContractorReviews(c.id),
  ])
  const canManage = role === "owner" || role === "admin"
  const name = c.companyName ?? "Your company"
  const verified = getVerificationState(c) === "verified"
  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(c.createdAt)
  const rating = c.avgRating ? Number(c.avgRating) : null

  return (
    <div className="mx-auto w-full space-y-8 lg:space-y-[2.222vw]">
      {/* Header — banner + overlapping logo, sitting open on the page */}
      <header>
        <div className="relative h-36 lg:h-[12vw] w-full overflow-hidden rounded-xl lg:rounded-[1vw]">
          {c.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.bannerUrl} alt="" className="size-full object-cover" />
          ) : (
            <>
              <div className="size-full bg-gradient-to-tr from-primary/30 via-primary/15 to-secondary/25" />
              <div className="absolute inset-0 bg-[radial-gradient(80%_140%_at_85%_-20%,rgba(255,255,255,0.4),transparent_60%)]" />
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:gap-[1.111vw] px-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4 lg:gap-[1.111vw]">
            <div className="relative -mt-12 lg:-mt-[5vw] shrink-0">
              <Avatar className="size-24 lg:size-[7vw] rounded-2xl lg:rounded-[1.111vw] ring-4 lg:ring-[0.278vw] ring-background">
                {c.logoUrl ? (
                  <AvatarImage src={c.logoUrl} alt="" className="rounded-2xl lg:rounded-[1.111vw]" />
                ) : null}
                <AvatarFallback className="rounded-2xl lg:rounded-[1.111vw] bg-muted text-2xl lg:text-[2vw] font-semibold text-foreground/70">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              {verified ? (
                <span
                  className="absolute -bottom-1 -right-1 lg:-bottom-[0.278vw] lg:-right-[0.278vw] flex size-6 lg:size-[1.667vw] items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 lg:ring-[0.139vw] ring-background"
                  title="Verified company"
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="lg:size-[0.764vw]">
                    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : null}
            </div>

            <div className="min-w-0 pb-1 lg:pb-[0.278vw]">
              <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
                <h1 className="font-sebenta text-2xl lg:text-[1.944vw] font-bold tracking-tight">
                  {name}
                </h1>
                {verified ? (
                  <span className="inline-flex items-center gap-1 lg:gap-[0.278vw] rounded-full bg-secondary px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-semibold text-secondary-foreground">
                    <Icon name="shield-done" className="size-3.5 lg:size-[0.972vw]" />
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
                {c.yearsInBusiness != null
                  ? `Roofing · ${c.yearsInBusiness} year${c.yearsInBusiness === 1 ? "" : "s"} in business`
                  : "Roofing contractor"}
                {areas[0]?.label ? ` · ${areas[0].label}` : ""}
              </p>
            </div>
          </div>

          {canManage ? (
            <Button asChild variant="outline" className="shrink-0 gap-1.5 lg:gap-[0.417vw]">
              <Link href="/contractor/settings/company">
                <Icon name="edit" className="size-4 lg:size-[1.111vw]" />
                Edit profile
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      {/* Body — open two columns, one light divider, no per-section boxes */}
      <div className="grid gap-y-8 lg:gap-y-[2.222vw] lg:grid-cols-[1.7fr_1fr] lg:gap-x-10">
        <div className="space-y-8 lg:space-y-[2.222vw]">
          <Section title="About">
            {c.bio ? (
              <p className="max-w-prose text-[15px] lg:text-[1.042vw] leading-relaxed text-foreground/80">
                {c.bio}
              </p>
            ) : (
              <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
                {canManage
                  ? "No description yet. Add a short bio so homeowners get a feel for your work."
                  : "No description yet."}
              </p>
            )}
          </Section>

          <Section title="Services">
            {subtypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 lg:gap-[0.556vw]">
                {subtypes.map((s) => (
                  <ServiceTag key={s} label={s} />
                ))}
              </div>
            ) : (
              <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
                {canManage
                  ? "No services yet. Add the services you offer so the right jobs reach you."
                  : "No services listed yet."}
              </p>
            )}
          </Section>
        </div>

        <aside className="space-y-8 lg:space-y-[2.222vw] lg:border-l lg:border-border lg:pl-10">
          <Section title="At a glance">
            <ul className="space-y-3 lg:space-y-[0.833vw] text-sm lg:text-[0.972vw]">
              <li className="flex items-center gap-2.5 lg:gap-[0.694vw]">
                <Icon
                  name={verified ? "shield-done" : "shield-fail"}
                  className={
                    verified
                      ? "size-4 lg:size-[1.111vw] text-secondary"
                      : "size-4 lg:size-[1.111vw] text-muted-foreground"
                  }
                />
                {verified ? "Licensed & insured" : "Verification pending"}
              </li>
              {rating && c.totalReviews > 0 ? (
                <li className="flex items-center gap-2.5 lg:gap-[0.694vw]">
                  <Icon name="star" className="size-4 lg:size-[1.111vw] text-amber-400" />
                  {rating.toFixed(1)} · {c.totalReviews} review
                  {c.totalReviews === 1 ? "" : "s"}
                </li>
              ) : (
                <li className="flex items-center gap-2.5 lg:gap-[0.694vw] text-muted-foreground">
                  <Icon name="star" className="size-4 lg:size-[1.111vw]" />
                  No reviews yet
                </li>
              )}
              <li className="flex items-center gap-2.5 lg:gap-[0.694vw] text-muted-foreground">
                <Icon name="time-circle" className="size-4 lg:size-[1.111vw]" />
                On Homei since {memberSince}
              </li>
            </ul>
          </Section>

          <Section title="Coverage">
            {areas.length > 0 ? (
              <ul className="space-y-3 lg:space-y-[0.833vw] text-sm lg:text-[0.972vw]">
                {areas.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 lg:gap-[0.694vw]">
                    <Icon name="location" className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">{a.label ?? "Area"}</span>
                    <span className="ml-auto shrink-0 text-[13px] lg:text-[0.903vw] font-medium text-muted-foreground">
                      {coverageBadge(a)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
                {canManage
                  ? "No coverage areas yet. Add the places you serve so we can match you to nearby jobs."
                  : "No coverage areas yet."}
              </p>
            )}
          </Section>
        </aside>
      </div>

      {portfolio.length > 0 ? (
        <Section title="Recent work">
          <PortfolioGallery items={portfolio} />
        </Section>
      ) : null}

      {reviews.total > 0 ? (
        <Section title="Reviews">
          <div className="space-y-5 lg:space-y-[1.389vw]">
            <ReviewsSummaryCard summary={reviews} />
            <ReviewList reviews={reviews.reviews.slice(0, 4)} />
            {reviews.total > 4 ? (
              <Link
                href="/contractor/reviews"
                className="inline-block text-sm lg:text-[0.903vw] font-medium text-primary hover:underline"
              >
                View all {reviews.total} reviews
              </Link>
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  )
}

// Open section: a small label heading + content, no bordered box.
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 lg:mb-[0.833vw] text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}
