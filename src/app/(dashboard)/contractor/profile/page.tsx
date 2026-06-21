import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getMembershipRole,
  getServiceAreas,
  getContractorSubtypes,
  getContractorWonCount,
} from "@/lib/data/dashboard"
import { getPortfolio } from "@/lib/data/portfolio"
import { getCombinedReviews, getExternalMedia } from "@/lib/data/integrations"
import { ServiceTag } from "@/components/ui/service-tag"
import { getVerificationState } from "@/lib/contractor/verification"
import { scoreStanding } from "@/lib/reputation/labels"
import { WorkGallery } from "@/components/dashboard/profile/work-gallery"
import { ReviewsBlock } from "@/components/dashboard/reviews/reviews-block"
import { ProfileHeader, type ProfileStat } from "@/components/dashboard/profile/profile-header"
import { ProfileCompleteness, type CompletenessItem } from "@/components/dashboard/profile/profile-completeness"
import { CoverageCard } from "@/components/dashboard/profile/coverage-card"
import { Icon } from "@/components/ui/icon"
import { ProfileSkeleton } from "@/components/dashboard/skeletons"

const COMPANY_SETTINGS = "/contractor/settings/company"
const COVERAGE_SETTINGS = "/contractor/settings/service-area"

export default function ContractorProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileBody />
    </Suspense>
  )
}

async function ProfileBody() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const [role, subtypes, areas, portfolio, reviews, googleMedia, wonCount] = await Promise.all([
    getMembershipRole(user.id, c.id),
    getContractorSubtypes(c.id),
    getServiceAreas(c.id),
    getPortfolio(c.id, { publishedOnly: true }),
    getCombinedReviews(c.id),
    getExternalMedia(c.id),
    getContractorWonCount(c.id),
  ])
  const canManage = role === "owner" || role === "admin"
  const name = c.companyName ?? "Your company"
  const verified = getVerificationState(c) === "verified"
  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(c.createdAt)
  // Combined (Hommy + Google) rating for DISPLAY only — the cached
  // contractors.avg_rating/total_reviews that drive ranking stay Hommy-only.
  const rating = reviews.avgRating
  const standing = scoreStanding(c.profileScore)

  const metaLine = [
    "Roofing",
    c.yearsInBusiness != null
      ? `${c.yearsInBusiness} year${c.yearsInBusiness === 1 ? "" : "s"} in business`
      : null,
    areas[0]?.label ?? null,
  ]
    .filter(Boolean)
    .join(" · ")

  const stats: ProfileStat[] = [
    { label: "Rating", value: rating ? rating.toFixed(1) : "—", star: true },
    { label: reviews.total === 1 ? "Review" : "Reviews", value: String(reviews.total) },
    ...(c.yearsInBusiness != null
      ? [{ label: "Years", value: String(c.yearsInBusiness) } satisfies ProfileStat]
      : []),
    { label: wonCount === 1 ? "Job won" : "Jobs won", value: String(wonCount) },
    { label: standing.label, value: String(c.profileScore), accent: true, href: "/contractor/analytics" },
  ]

  const completeness: CompletenessItem[] = [
    { label: "Add a logo", done: !!c.logoUrl, href: COMPANY_SETTINGS },
    { label: "Write a bio", done: !!c.bio, href: COMPANY_SETTINGS },
    { label: "List your services", done: subtypes.length > 0, href: COMPANY_SETTINGS },
    { label: "Set coverage areas", done: areas.length > 0, href: COVERAGE_SETTINGS },
    { label: "Add 3 work photos", done: portfolio.length >= 3, href: COMPANY_SETTINGS },
  ]

  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-[1.667vw]">
      <ProfileHeader
        name={name}
        verified={verified}
        logoUrl={c.logoUrl}
        metaLine={metaLine}
        stats={stats}
        canManage={canManage}
        editHref={COMPANY_SETTINGS}
      />

      {canManage ? <ProfileCompleteness items={completeness} /> : null}

      {/* Body — main column + sidebar of clean section cards */}
      <div className="grid gap-6 lg:gap-[1.667vw] lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-8 lg:space-y-[2.222vw]">
          <SectionCard title="About">
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
          </SectionCard>

          {portfolio.length > 0 || googleMedia.length > 0 ? (
            <SectionCard title="Recent work">
              <WorkGallery portfolio={portfolio} google={googleMedia} />
            </SectionCard>
          ) : null}

          {reviews.total > 0 ? (
            <SectionCard title="Reviews">
              <ReviewsBlock
                summary={reviews}
                reviews={reviews.reviews}
                homeiCount={reviews.homeiCount}
                googleCount={reviews.googleCount}
              />
            </SectionCard>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="divide-y divide-border rounded-2xl lg:rounded-[1.111vw] border border-border bg-card">
            <SubSection title="Details">
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
                <li className="flex items-center gap-2.5 lg:gap-[0.694vw] text-muted-foreground">
                  <Icon name="time-circle" className="size-4 lg:size-[1.111vw]" />
                  On Homei since {memberSince}
                </li>
              </ul>
            </SubSection>

            <SubSection title="Services">
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
            </SubSection>

            <SubSection title="Coverage">
              <CoverageCard areas={areas} canManage={canManage} />
            </SubSection>
          </div>
        </aside>
      </div>
    </div>
  )
}

// An open section: a bold heading + content, no bordered box.
function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-4 lg:mb-[1.111vw] text-base lg:text-[1.25vw] font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

// A sub-section inside the sidebar card (divided rows).
function SubSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="p-5 lg:p-[1.389vw]">
      <h2 className="mb-3 lg:mb-[0.833vw] text-sm lg:text-[0.972vw] font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </div>
  )
}
