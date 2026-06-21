"use client"

import { useState } from "react"
import confetti from "canvas-confetti"
import { SetupModal } from "@/components/dashboard/setup-modal"
import { AnimatedCheck } from "@/components/ui/animated-check"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"
import {
  ClimbVariantImpact,
  HowToClimbCards,
  ClimbVariantJourney,
} from "@/components/dashboard/analytics/climb-variants"
import { CoverageMap } from "@/components/dashboard/analytics/coverage-map"
import { HUB, ORIGINS } from "@/components/dashboard/analytics/map-sample"
import {
  HeaderVariantCard,
  HeaderVariantCompact,
  HeaderVariantImmersive,
  HEADER_SAMPLE,
} from "@/components/dashboard/profile/header-variants"

export default function SandboxPage() {
  const [setupOpen, setSetupOpen] = useState(false)
  const [checkKey, setCheckKey] = useState(0)

  return (
    <div className="min-h-svh bg-canvas text-foreground">
      <div className="mx-auto space-y-8 lg:space-y-[2.222vw] px-6 lg:px-[1.667vw] py-12 lg:py-[3.333vw]">
        <header>
          <h1 className="font-sebenta text-3xl lg:text-[2.083vw] font-bold tracking-tight">
            Component sandbox
          </h1>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            A place to preview UI in isolation, outside the real flows.
          </p>
        </header>

        <Section
          title="Setup popup (Phase 3)"
          desc="The first-time contractor setup flow. Demo mode — Finish is a no-op, but uploads, steps, and confetti are real."
        >
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="rounded-full bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-semibold text-primary-foreground"
          >
            Open setup popup
          </button>
          <SetupModal
            open={setupOpen}
            onOpenChange={setSetupOpen}
            initial={{
              logoUrl: null,
              companyName: "Lone Star Roofing Co.",
              phone: "",
              bio: "",
              licenseDocUrl: null,
              insuranceDocUrl: null,
            }}
            onSubmit={async () => {
              await new Promise((r) => setTimeout(r, 400))
              return { ok: true }
            }}
          />
        </Section>

        <Section
          title="Animated check"
          desc="Reusable success draw animation (AnimatedCheck)."
        >
          <div className="flex items-center gap-6 lg:gap-[1.667vw]">
            <div key={checkKey}>
              <AnimatedCheck />
            </div>
            <button
              type="button"
              onClick={() => setCheckKey((k) => k + 1)}
              className="rounded-full border border-foreground/15 px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium transition-colors hover:bg-muted"
            >
              Replay
            </button>
          </div>
        </Section>

        <Section title="Confetti" desc="Full-screen celebration burst.">
          <button
            type="button"
            onClick={() =>
              confetti({ particleCount: 160, spread: 90, startVelocity: 45, origin: { y: 0.6 } })
            }
            className="rounded-full bg-foreground px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-semibold text-background"
          >
            Fire confetti
          </button>
        </Section>

        <Section
          title="Sidebar notices"
          desc="Soft, type-coded notice cards for the sidebar. Shown at sidebar width (~14rem) so the focus-pulling action button reads as it will in the real shell."
        >
          <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
            <div className="w-56 lg:w-[15.556vw]">
              <SidebarNotice
                tone="info"
                title="We’re reviewing your verification"
                body="We’ll let you know the moment you’re approved."
                cta={{ label: "View", href: "#" }}
              />
            </div>
            <div className="w-56 lg:w-[15.556vw]">
              <SidebarNotice
                tone="warning"
                title="Verification needs attention"
                body="Update your license or insurance to keep going."
                cta={{ label: "Review", href: "#" }}
              />
            </div>
            <div className="w-56 lg:w-[15.556vw]">
              <SidebarNotice
                tone="success"
                title="240 credits"
                body="Spent only when you win a job."
                cta={{ label: "Buy credits", href: "#" }}
              />
            </div>
            <div className="w-56 lg:w-[15.556vw]">
              <SidebarNotice
                tone="announcement"
                title="Finish verifying"
                body="Add your license to start winning jobs."
                cta={{ label: "Get verified", href: "#" }}
              />
            </div>
          </div>
        </Section>

        {/* "How to climb your score" — redesign variants */}
        <div className="space-y-2 lg:space-y-[0.556vw]">
          <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
            “How to climb your score” — redesign variants
          </h2>
          <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
            Three takes on the reputation guide. Goal: clearer UI plus better explanation of how scoring (and the platform) works.
          </p>
        </div>

        <div className="max-w-5xl lg:max-w-[68vw] space-y-10 lg:space-y-[2.778vw]">
          <Variant label="Variant 1 — Impact bars" note="Two columns (earn / lose) with bars sized by point weight, so the relative importance reads instantly.">
            <ClimbVariantImpact />
          </Variant>
          <Variant label="Variant 2 — Do / Avoid cards (chosen)" note="A clear good-vs-bad split: a green “grow” card and a red “protect” card, each with checks/crosses and points.">
            <HowToClimbCards />
          </Variant>
          <Variant label="Variant 3 — Journey" note="Teaches the platform flow (lead → engage → quote → win → review) with score gains along the path, and a penalties footer.">
            <ClimbVariantJourney />
          </Variant>
        </div>

        {/* Coverage map — chosen: static SVG, auto-fit to the data */}
        <div className="space-y-2 lg:space-y-[0.556vw]">
          <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
            Coverage / leads map (static SVG)
          </h2>
          <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
            Sample data. Auto-zooms to the points (real single-metro data zooms tighter). Hover a dot for the city + lead count.
          </p>
        </div>

        <div className="max-w-xl lg:max-w-[40vw] rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-4 lg:p-[1.111vw]">
          <CoverageMap hub={HUB} origins={ORIGINS} />
        </div>

        {/* Profile header variants */}
        <div className="space-y-2 lg:space-y-[0.556vw]">
          <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
            Profile header variants
          </h2>
          <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
            Three directions for the contractor profile hero (banner + logo + identity + trust stats). Shown with the default gradient banner and an initials logo.
          </p>
        </div>

        <div className="max-w-5xl lg:max-w-[68vw] space-y-10 lg:space-y-[2.778vw]">
          <Variant label="Variant 1 — Unified card" note="Banner with one card overlapping its bottom edge; logo peeks above, and the trust stats are embedded in the same card with divider lines. Cohesive and premium.">
            <HeaderVariantCard data={HEADER_SAMPLE} />
          </Variant>
          <Variant label="Variant 2 — Compact (no banner)" note="No big banner — a tidy business header with a thin gradient accent strip and an inline stat row. Fast, dense, very dashboard-like.">
            <HeaderVariantCompact data={HEADER_SAMPLE} />
          </Variant>
          <Variant label="Variant 3 — Immersive banner" note="Tall gradient banner with the identity in white over a scrim and frosted-glass stat chips along the bottom. Bold, marketing-forward.">
            <HeaderVariantImmersive data={HEADER_SAMPLE} />
          </Variant>
        </div>

      </div>
    </div>
  )
}

function Variant({
  label,
  note,
  children,
}: {
  label: string
  note: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3 lg:mb-[0.833vw]">
        <p className="text-sm lg:text-[0.972vw] font-semibold text-foreground">{label}</p>
        <p className="text-xs lg:text-[0.833vw] text-muted-foreground">{note}</p>
      </div>
      {children}
    </div>
  )
}


function Section({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-6 lg:p-[1.667vw]">
      <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">{title}</h2>
      <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">{desc}</p>
      <div className="mt-5 lg:mt-[1.389vw]">{children}</div>
    </section>
  )
}
