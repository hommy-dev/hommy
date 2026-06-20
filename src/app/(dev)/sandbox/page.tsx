"use client"

import { useState } from "react"
import confetti from "canvas-confetti"
import { SetupModal } from "@/components/dashboard/setup-modal"
import { AnimatedCheck } from "@/components/ui/animated-check"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"

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

      </div>
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
