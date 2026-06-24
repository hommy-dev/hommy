import type { ReactNode } from "react"

import type { PortfolioProject } from "@/lib/data/portfolio"
import type { ExternalMediaItem, CombinedReviews } from "@/lib/data/integrations"
import type { ServiceArea } from "@/lib/data/dashboard"
import { Icon } from "@/components/ui/icon"
import { ServiceTag } from "@/components/ui/service-tag"
import { WorkGallery } from "@/components/dashboard/profile/work-gallery"
import { ReviewsBlock } from "@/components/dashboard/reviews/reviews-block"
import { ProfileHeader, type ProfileStat } from "@/components/dashboard/profile/profile-header"
import { ProfileCompleteness, type CompletenessItem } from "@/components/dashboard/profile/profile-completeness"
import { CoverageCard } from "@/components/dashboard/profile/coverage-card"

/**
 * The single, shared contractor profile body — rendered identically by the
 * contractor's own dashboard (`/contractor/profile`, `canManage`) and the public
 * page (`/roofers/[slug]`, read-only). Keeping one component means the two views
 * can never drift. All data is passed in; this component is presentational.
 */
export function ContractorProfileView({
  name,
  verified,
  logoUrl,
  metaLine,
  stats,
  bio,
  portfolio,
  googleMedia,
  reviews,
  subtypes,
  areas,
  memberSince,
  canManage,
  editHref,
  completeness,
  primaryCta,
}: {
  name: string
  verified: boolean
  logoUrl: string | null
  metaLine: string
  stats: ProfileStat[]
  bio: string | null
  portfolio: PortfolioProject[]
  googleMedia: ExternalMediaItem[]
  reviews: CombinedReviews
  subtypes: string[]
  areas: ServiceArea[]
  memberSince: string
  canManage: boolean
  editHref: string
  /** Owner-only profile-completeness checklist (dashboard view). */
  completeness?: CompletenessItem[]
  /** Public-only primary action (e.g. "Get a free quote"), shown under the header. */
  primaryCta?: ReactNode
}) {
  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-[1.667vw]">
      <ProfileHeader
        name={name}
        verified={verified}
        logoUrl={logoUrl}
        metaLine={metaLine}
        stats={stats}
        canManage={canManage}
        editHref={editHref}
      />

      {primaryCta ? <div>{primaryCta}</div> : null}

      {canManage && completeness ? <ProfileCompleteness items={completeness} /> : null}

      {/* Body — main column + sidebar of clean section cards */}
      <div className="grid gap-6 lg:gap-[1.667vw] lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-8 lg:space-y-[2.222vw]">
          <SectionCard title="About">
            {bio ? (
              <p className="max-w-prose text-[15px] lg:text-[1.042vw] leading-relaxed text-foreground/80">
                {bio}
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
                hommyCount={reviews.hommyCount}
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
                  On Hommy since {memberSince}
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
function SectionCard({ title, children }: { title: string; children: ReactNode }) {
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
function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="p-5 lg:p-[1.389vw]">
      <h2 className="mb-3 lg:mb-[0.833vw] text-sm lg:text-[0.972vw] font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </div>
  )
}
