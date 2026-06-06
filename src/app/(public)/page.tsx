import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/public/site-header"

export const metadata: Metadata = {
  title: "Homei | Find a roofer you can actually trust",
  description:
    "Tell us what is going on with your roof and we will match you with a few licensed, insured local roofers. Free, no spam calls, no pressure.",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <WhyHomei />
        <Services />
        <Storm />
        <Testimonials />
        <ProCta />
      </main>
      <SiteFooter />
    </div>
  )
}

// ────────────────────────────── HERO ──────────────────────────────

// ⬇ SWAP THIS for your real home/roof photo: drop it in public/bg/ and change
// this one path. A warm, slightly aspirational shot of a nice home/roof works best.
const HERO_IMAGE = "/bg/hero.jpg"

function Hero() {
  return (
    <section className="relative w-full overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt="A well-kept home with a freshly finished roof"
        fill
        priority
        sizes="100vw"
        className="object-bottom object-cover"
      />

      {/* Warm scrim — keeps the centered dark text readable over the photo. */}
      {/* <div className="absolute inset-0 bg-gradient-to-b from-background/90 from-5% to-transparent to-30%" /> */}

      <div
        id="quote"
        className="relative mx-auto flex min-h-[36rem] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center lg:min-h-screen"
      >
        <h1 className="font-sebenta text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
          Find a roofer you can actually trust.
        </h1>

        <p className="mt-4 max-w-md text-[17px] leading-relaxed text-foreground/70">
          A few vetted local roofers, matched to your job. Free, no pressure.
        </p>

        <Link
          href="/get-a-quote"
          className="group mt-7 inline-flex items-center gap-2 rounded-lg bg-foreground px-7 py-3.5 text-base font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          Post a job
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path
              d="M3 8h9m0 0l-3.5-3.5M12 8l-3.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-foreground/65">
          <span className="inline-flex items-center gap-1.5">
            <Stars />
            <span className="font-medium text-foreground">4.8</span>
            from homeowners
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="text-primary" />
            Licensed &amp; insured
          </span>
        </div>
      </div>
    </section>
  )
}

// ───────────────────────────── TRUST ─────────────────────────────

const TRUST = [
  { stat: "Under 1 hr", label: "typical time to hear back" },
  { stat: "A few, not 30", label: "vetted roofers, no call floods" },
  { stat: "100%", label: "licensed and insured" },
  { stat: "$0", label: "what you pay, ever" },
]

function TrustStrip() {
  return (
    <section className="mx-auto max-w-6xl px-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.stat} className="bg-card px-5 py-6 text-center">
            <p className="font-sebenta text-2xl font-bold tracking-tight">
              {t.stat}
            </p>
            <p className="mt-1 text-sm text-foreground/55">{t.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ────────────────────────── HOW IT WORKS ──────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Tell us about your roof",
    body: "Takes about two minutes. What is wrong, where you are, and how soon you need it.",
  },
  {
    n: "02",
    title: "We match you with local roofers",
    body: "We hand your job to a few vetted roofers nearby. The ones who do good work, not whoever paid to be first.",
  },
  {
    n: "03",
    title: "Compare and pick",
    body: "They reach out, you compare real quotes, you choose. Or you walk away. Totally up to you.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 lg:py-28">
      <SectionHead
        eyebrow="How it works"
        title="Sorted in three steps."
        sub="No accounts to wrestle with, no fine print. Just a fast way to reach roofers worth your time."
      />
      <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
        {STEPS.map((s) => (
          <div key={s.n} className="relative">
            <p className="font-sebenta text-5xl font-bold text-foreground/12">
              {s.n}
            </p>
            <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/60">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ───────────────────────────── WHY ─────────────────────────────

const REASONS = [
  {
    title: "No flood of spam calls",
    body: "A few local roofers, not twenty. We will never sell your number to a call center.",
  },
  {
    title: "Vetted before they reach you",
    body: "Every roofer shows us a valid license and proof of insurance before they can quote your job.",
  },
  {
    title: "Always free for you",
    body: "You never pay Homei a cent, so our advice stays on your side.",
  },
  {
    title: "Pros who actually answer",
    body: "We work with roofers who pick up the phone and turn up when they say they will.",
  },
]

function WhyHomei() {
  return (
    <section id="why" className="scroll-mt-20 bg-foreground py-20 text-background lg:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Why Homei
          </span>
          <h2 className="mt-3 font-sebenta text-3xl font-bold leading-[1.08] tracking-tight sm:text-[2.6rem]">
            Hiring a roofer should not feel like a gamble.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-background/65">
            You have heard the horror stories. The no-shows, the surprise bills,
            the guy who vanished after the deposit. We built Homei to take that
            fear out of it.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-background/10 sm:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.title} className="bg-foreground p-7">
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Check />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-background/60">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────── SERVICES ───────────────────────────

const SERVICES = [
  {
    title: "Roof repair",
    body: "Leaks, missing shingles, that spot that keeps nagging you. Get it sorted before it gets worse.",
    cls: "bg-primary text-primary-foreground",
    sub: "text-primary-foreground/70",
  },
  {
    title: "Full replacement",
    body: "When the old roof is done, get straight numbers from roofers who will stand behind the work.",
    cls: "bg-secondary text-secondary-foreground",
    sub: "text-secondary-foreground/65",
  },
  {
    title: "Storm damage",
    body: "Hit by hail or high wind? Get inspected fast, and find a roofer who knows the insurance side.",
    cls: "bg-tertiary text-[#3a0a18]",
    sub: "text-[#3a0a18]/65",
  },
  {
    title: "Roof inspection",
    body: "Buying, selling, or just want to know. Find out exactly what shape your roof is in.",
    cls: "bg-foreground text-background",
    sub: "text-background/60",
  },
]

function Services() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <SectionHead
        eyebrow="What we cover"
        title="Whatever your roof needs."
        sub="One roof, a lot of ways it can go wrong. Whatever you are dealing with, there is a local roofer for it."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s) => (
          <Link
            key={s.title}
            href="#quote"
            className={`group flex min-h-52 flex-col justify-between rounded-3xl p-6 transition-transform hover:-translate-y-1 ${s.cls}`}
          >
            <h3 className="font-sebenta text-xl font-bold tracking-tight">
              {s.title}
            </h3>
            <div>
              <p className={`text-sm leading-relaxed ${s.sub}`}>{s.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                Get a quote
                <Arrow className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ──────────────────────────── STORM ────────────────────────────

function Storm() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-primary px-7 py-12 text-primary-foreground sm:px-12 sm:py-16">
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
              Storm season
            </span>
            <h2 className="mt-3 max-w-xl font-sebenta text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
              When a storm hits, you should not be left scrambling.
            </h2>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-primary-foreground/75">
              We keep an eye on severe weather in your area. The moment hail or
              high wind rolls through, we can connect you with roofers who handle
              storm damage and know how to work with your insurance. No chasing,
              no waiting on hold.
            </p>
            <Link
              href="#quote"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Check my area
              <Arrow />
            </Link>
          </div>
          <div className="hidden justify-self-end lg:block">
            <div className="rounded-3xl bg-primary-foreground/10 p-6 backdrop-blur-sm">
              <p className="font-sebenta text-5xl font-bold">24/7</p>
              <p className="mt-1 text-sm text-primary-foreground/70">
                weather watch on your ZIP code
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ───────────────────────── TESTIMONIALS ─────────────────────────

const REVIEWS = [
  {
    quote:
      "I had three roofers out by the next afternoon. I went with the one who actually explained things instead of talking over my head. New roof in a week.",
    name: "Maria A.",
    city: "Dallas, TX",
  },
  {
    quote:
      "We had a leak in the middle of a storm and no clue who to call. Homei had someone at the house the next morning. No drama.",
    name: "James C.",
    city: "Fort Worth, TX",
  },
  {
    quote:
      "I kept putting off getting quotes because I dreaded the spam. This was just two local roofers, both solid, both upfront.",
    name: "Priya N.",
    city: "Plano, TX",
  },
]

function Testimonials() {
  return (
    <section id="reviews" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 lg:py-28">
      <SectionHead
        eyebrow="Reviews"
        title="Real homeowners. Real roofs."
        sub="The whole point is that you walk away glad you called. Here is how that has gone."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure
            key={r.name}
            className="flex flex-col rounded-3xl border border-foreground/10 bg-card p-7"
          >
            <Stars />
            <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground/80">
              {r.quote}
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted font-sebenta text-sm font-bold text-foreground/70">
                {r.name.charAt(0)}
              </span>
              <span>
                <span className="block text-sm font-semibold">{r.name}</span>
                <span className="block text-xs text-foreground/50">{r.city}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

// ───────────────────────────── PRO CTA ─────────────────────────────

function ProCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 lg:pb-28">
      <div className="grid items-center gap-8 rounded-[2rem] border border-foreground/10 bg-card px-7 py-12 sm:px-12 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
            Are you a roofer?
          </span>
          <h2 className="mt-3 font-sebenta text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            Real leads. No upfront cost.
          </h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-foreground/65">
            Get matched with homeowners near you who actually need work done.
            There is no charge to receive a lead. You only pay when you win the
            job. Plus a CRM built for how roofers really work.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <Link
            href="/contractors"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Join as a pro
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ───────────────────────────── FOOTER ─────────────────────────────

const FOOTER = [
  {
    title: "For homeowners",
    links: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#quote", label: "Get a quote" },
      { href: "#reviews", label: "Reviews" },
    ],
  },
  {
    title: "For roofers",
    links: [
      { href: "/contractors", label: "Become a pro" },
      { href: "/contractors", label: "How it works" },
      { href: "/auth/login", label: "Sign in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#", label: "About" },
      { href: "#", label: "Contact" },
      { href: "#", label: "Privacy" },
    ],
  },
]

function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <p className="font-sebenta text-xl font-bold">Homei</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-background/55">
              Home services, done right. Starting with roofing.
            </p>
            <Link
              href="#quote"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
            >
              Get my quotes
              <Arrow />
            </Link>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-background/45">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-background/70 transition-colors hover:text-background"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* big wordmark */}
        <div className="mt-16 border-t border-background/10 pt-8">
          <p className="font-sebenta text-[18vw] font-bold leading-[0.8] tracking-tighter text-background/10 lg:text-[12rem]">
            Homei
          </p>
          <p className="mt-6 text-xs text-background/45">
            © 2026 Homei. Licensed and insured roofers only.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────── shared bits ───────────────────────────

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string
  title: string
  sub: string
}) {
  return (
    <div className="max-w-2xl">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-sebenta text-3xl font-bold leading-[1.08] tracking-tight sm:text-[2.6rem]">
        {title}
      </h2>
      <p className="mt-4 text-[17px] leading-relaxed text-foreground/60">{sub}</p>
    </div>
  )
}

function Stars() {
  return (
    <span className="inline-flex gap-0.5 text-tertiary" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 1l1.7 3.6 3.9.5-2.9 2.7.7 3.9L7 9.9 3.6 11.7l.7-3.9L1.4 5.1l3.9-.5L7 1z" />
        </svg>
      ))}
    </span>
  )
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 8h9m0 0l-3.5-3.5M12 8l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
