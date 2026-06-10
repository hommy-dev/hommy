import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getMembershipRole,
  getServiceAreas,
  getContractorSubtypes,
} from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
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

  const [role, subtypes, areas] = await Promise.all([
    getMembershipRole(user.id, c.id),
    getContractorSubtypes(c.id),
    getServiceAreas(c.id),
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
    <div className="mx-auto w-full max-w-4xl lg:max-w-[60vw] space-y-6 lg:space-y-[1.667vw]">
      {canManage ? (
        <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
          This is how homeowners see your company.
        </p>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:gap-[1.111vw] rounded-lg lg:rounded-[0.833vw] border border-border bg-card p-6 lg:p-[1.667vw] sm:flex-row sm:items-center">
        <Avatar className="size-20 lg:size-[5.556vw] rounded-lg lg:rounded-[0.833vw]">
          {c.logoUrl ? (
            <AvatarImage src={c.logoUrl} alt="" className="rounded-lg lg:rounded-[0.833vw]" />
          ) : null}
          <AvatarFallback className="rounded-lg lg:rounded-[0.833vw] bg-muted text-xl lg:text-[1.667vw] font-semibold text-foreground/70">
            {initials(name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
            <h1 className="font-sebenta text-2xl lg:text-[1.944vw] font-bold tracking-tight">
              {name}
            </h1>
            {verified ? (
              <span className="inline-flex items-center gap-1 lg:gap-[0.278vw] rounded-full bg-secondary px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-semibold text-secondary-foreground">
                <Icon name="shield-done" className="size-3.5 lg:size-[0.972vw]" />
                Verified
              </span>
            ) : null}
          </div>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            {c.yearsInBusiness != null
              ? `Roofing · ${c.yearsInBusiness} year${c.yearsInBusiness === 1 ? "" : "s"} in business`
              : "Roofing contractor"}
            {areas[0]?.label ? ` · ${areas[0].label}` : ""}
          </p>
        </div>

        {canManage ? (
          <Button asChild variant="outline" className="gap-1.5 lg:gap-[0.417vw]">
            <Link href="/contractor/settings/company">
              <Icon name="edit" className="size-4 lg:size-[1.111vw]" />
              Edit profile
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:gap-[1.667vw] lg:grid-cols-[1.6fr_1fr]">
        {/* Left: about + services */}
        <div className="space-y-6 lg:space-y-[1.667vw]">
          <Card title="About">
            {c.bio ? (
              <p className="text-sm lg:text-[0.972vw] leading-relaxed text-foreground/80">
                {c.bio}
              </p>
            ) : (
              <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
                No description yet.
              </p>
            )}
          </Card>

          <Card title="Services">
            {subtypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 lg:gap-[0.556vw]">
                {subtypes.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-sm lg:text-[0.972vw] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
                No services listed yet.
              </p>
            )}
          </Card>
        </div>

        {/* Right: trust + coverage + stats */}
        <div className="space-y-6 lg:space-y-[1.667vw]">
          <Card title="Trust">
            <ul className="space-y-2.5 lg:space-y-[0.694vw] text-sm lg:text-[0.972vw]">
              <li className="flex items-center gap-2 lg:gap-[0.556vw]">
                <Icon
                  name={verified ? "shield-done" : "shield-fail"}
                  className={verified ? "size-4 lg:size-[1.111vw] text-secondary" : "size-4 lg:size-[1.111vw] text-muted-foreground"}
                />
                {verified ? "Licensed & insured" : "Verification pending"}
              </li>
              {rating && c.totalReviews > 0 ? (
                <li className="flex items-center gap-2 lg:gap-[0.556vw]">
                  <Icon name="star" className="size-4 lg:size-[1.111vw] text-amber-400" />
                  {rating.toFixed(1)} · {c.totalReviews} review
                  {c.totalReviews === 1 ? "" : "s"}
                </li>
              ) : (
                <li className="flex items-center gap-2 lg:gap-[0.556vw] text-muted-foreground">
                  <Icon name="star" className="size-4 lg:size-[1.111vw]" />
                  No reviews yet
                </li>
              )}
              <li className="flex items-center gap-2 lg:gap-[0.556vw] text-muted-foreground">
                <Icon name="time-circle" className="size-4 lg:size-[1.111vw]" />
                On Homei since {memberSince}
              </li>
            </ul>
          </Card>

          <Card title="Coverage">
            {areas.length > 0 ? (
              <ul className="space-y-2 lg:space-y-[0.556vw] text-sm lg:text-[0.972vw]">
                {areas.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 lg:gap-[0.556vw]">
                    <Icon name="location" className="size-4 lg:size-[1.111vw] text-muted-foreground" />
                    <span className="min-w-0 truncate">{a.label ?? "Area"}</span>
                    <span className="ml-auto shrink-0 text-[13px] lg:text-[0.903vw] text-muted-foreground">
                      {a.radiusMiles} mi
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
                No coverage areas yet.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg lg:rounded-[0.833vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <h2 className="mb-3 lg:mb-[0.833vw] text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}
