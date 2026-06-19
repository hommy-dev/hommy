"use client"

import { useState } from "react"
import confetti from "canvas-confetti"
import { SetupModal } from "@/components/dashboard/setup-modal"
import { AnimatedCheck } from "@/components/ui/animated-check"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"
import {
  PremiumNotice,
  GreetingNotice,
  StatNotice,
  type NoticeModel,
} from "@/components/dashboard/sidebar-notice-variants"

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

        <Section
          title="Sidebar notice: premium variants (preview)"
          desc="Three directions × every scenario, at real sidebar width. A · Premium status card · B · Greeting + tip · C · Stat-rich. Pick one and I'll wire the winner into the real sidebar; the rest gets deleted."
        >
          <div className="space-y-8 lg:space-y-[2.222vw]">
            {NOTICE_SCENARIOS.map((s) => (
              <div key={s.label}>
                <p className="mb-3 lg:mb-[0.833vw] text-xs lg:text-[0.764vw] font-semibold uppercase tracking-wide text-foreground/70">
                  {s.label}
                </p>
                <div className="flex flex-wrap gap-5 lg:gap-[1.389vw]">
                  <VariantCol name="A · Premium">
                    <PremiumNotice model={s.model} />
                  </VariantCol>
                  <VariantCol name="B · Greeting">
                    <GreetingNotice model={s.model} />
                  </VariantCol>
                  <VariantCol name="C · Stat-rich">
                    <StatNotice model={s.model} />
                  </VariantCol>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

/** A labeled column at real sidebar width so the preview reads true. */
function VariantCol({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <span className="block text-[10px] lg:text-[0.694vw] font-medium uppercase tracking-wide text-muted-foreground">
        {name}
      </span>
      <div className="w-60 lg:w-[16.5vw]">{children}</div>
    </div>
  )
}

// Every notice scenario, with copy filled for all three variants so each can be
// compared on equal footing.
const NOTICE_SCENARIOS: { label: string; model: NoticeModel }[] = [
  {
    label: "Healthy wallet (default)",
    model: {
      tone: "success",
      icon: "wallet",
      eyebrow: "Wallet",
      headline: "55 credits ready, Dev",
      body: "Only spent when you win. ⭐ 4.6 · 15 reviews keeps you top of the list.",
      cta: { label: "Buy credits", href: "#" },
      greeting: "Evening, Dev 👋",
      message: "You're top-rated. Reply fast to stay at the top of the list.",
      stats: [
        { value: "55", label: "credits" },
        { value: "4.6★", label: "rating" },
        { value: "15", label: "reviews" },
      ],
    },
  },
  {
    label: "Running low on credits",
    model: {
      tone: "announcement",
      icon: "wallet",
      eyebrow: "Running low",
      urgent: true,
      headline: "3 credits left",
      body: "Top up so you don't miss your next win.",
      cta: { label: "Top up", href: "#" },
      greeting: "Heads up, Dev",
      message: "Down to 3 credits. Top up so you're ready for the next lead.",
      stats: [
        { value: "3", label: "credits" },
        { value: "4.6★", label: "rating" },
        { value: "2", label: "new leads" },
      ],
    },
  },
  {
    label: "Negative balance (owe)",
    model: {
      tone: "warning",
      icon: "danger-triangle",
      eyebrow: "Balance due",
      urgent: true,
      headline: "You owe 12 credits",
      body: "From a won job 🎉 Settle up to take new leads.",
      cta: { label: "Top up", href: "#" },
      greeting: "One thing, Dev",
      message: "You owe 12 from a won job. Settle up to take new leads.",
      stats: [
        { value: "−12", label: "credits" },
        { value: "4.6★", label: "rating" },
        { value: "5", label: "won" },
      ],
    },
  },
  {
    label: "New leads waiting",
    model: {
      tone: "info",
      icon: "discovery",
      eyebrow: "New leads",
      urgent: true,
      headline: "3 new leads near you 🔥",
      body: "Pros who reply first win most. Jump in.",
      cta: { label: "View leads", href: "#" },
      greeting: "Evening, Dev 👋",
      message: "3 new leads near you. Replying first wins the job.",
      stats: [
        { value: "3", label: "new leads" },
        { value: "55", label: "credits" },
        { value: "4.6★", label: "rating" },
      ],
    },
  },
  {
    label: "Not verified yet",
    model: {
      tone: "announcement",
      icon: "shield-done",
      eyebrow: "Get verified",
      headline: "One step left, Dev",
      body: "Add your license to start winning jobs in Dallas.",
      cta: { label: "Get verified", href: "#" },
      greeting: "Almost there, Dev",
      message: "Add your license to unlock leads in Dallas.",
      stats: [
        { value: "1", label: "step left" },
        { value: "55", label: "credits" },
        { value: "0", label: "leads" },
      ],
    },
  },
  {
    label: "Verification in review",
    model: {
      tone: "info",
      icon: "time-circle",
      eyebrow: "In review",
      headline: "We're reviewing you",
      body: "We'll ping you the moment you're approved, usually within a day.",
      cta: { label: "View status", href: "#" },
      greeting: "Hang tight, Dev",
      message: "Your verification is in review. We'll ping you when you're in.",
      stats: [
        { value: "~1d", label: "review" },
        { value: "55", label: "credits" },
        { value: "0", label: "leads" },
      ],
    },
  },
  {
    label: "Verification rejected",
    model: {
      tone: "warning",
      icon: "danger-triangle",
      eyebrow: "Action needed",
      urgent: true,
      headline: "Quick fix needed, Dev",
      body: "Update your license or insurance to keep winning jobs.",
      cta: { label: "Review", href: "#" },
      greeting: "Quick fix, Dev",
      message: "Your license needs updating. Fix it to keep winning jobs.",
      stats: [
        { value: "!", label: "action" },
        { value: "55", label: "credits" },
        { value: "4.6★", label: "rating" },
      ],
    },
  },
]

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
