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
import { getVerificationState } from "@/lib/contractor/verification"
import { scoreStanding } from "@/lib/reputation/labels"
import { type ProfileStat } from "@/components/dashboard/profile/profile-header"
import { type CompletenessItem } from "@/components/dashboard/profile/profile-completeness"
import { ContractorProfileView } from "@/components/contractors/contractor-profile-view"
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
    <ContractorProfileView
      name={name}
      verified={verified}
      logoUrl={c.logoUrl}
      metaLine={metaLine}
      stats={stats}
      bio={c.bio}
      portfolio={portfolio}
      googleMedia={googleMedia}
      reviews={reviews}
      subtypes={subtypes}
      areas={areas}
      memberSince={memberSince}
      canManage={canManage}
      editHref={COMPANY_SETTINGS}
      completeness={completeness}
    />
  )
}
