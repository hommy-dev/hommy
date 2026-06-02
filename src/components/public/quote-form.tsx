"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const SERVICES = [
  "Roof repair",
  "Full replacement",
  "Storm damage",
  "Roof inspection",
] as const

/**
 * Homeowner intake. For now it shows the inline confirmation state the homepage
 * spec calls for; it will be wired to the createLead server action (post-a-job +
 * frictionless auto-signup) when that module lands.
 */
export function QuoteForm({ className }: { className?: string }) {
  const [service, setService] = useState<string>(SERVICES[0])
  const [zip, setZip] = useState("")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const zipValid = /^\d{5}$/.test(zip.trim())

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!zipValid || pending) return
    setPending(true)
    window.setTimeout(() => {
      setPending(false)
      setDone(true)
    }, 650)
  }

  if (done) {
    return (
      <div
        className={cn(
          "rounded-3xl border border-foreground/10 bg-card p-6 shadow-[var(--shadow-lg)]",
          className,
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <CheckMark />
          </span>
          <p className="font-sebenta text-lg font-semibold">You are all set.</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/70">
          We are lining up roofers near{" "}
          <span className="font-medium text-foreground">{zip}</span> for your{" "}
          <span className="font-medium text-foreground">
            {service.toLowerCase()}
          </span>
          . Keep an eye on your phone, one of them will reach out shortly.
        </p>
        <p className="mt-3 text-xs text-foreground/50">
          It is free and there is no obligation.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-3xl border border-foreground/10 bg-card p-2.5 shadow-[var(--shadow-lg)]",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <label className="flex min-w-0 flex-1 flex-col rounded-2xl bg-muted/60 px-4 py-2.5 text-left focus-within:bg-muted">
          <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            What is going on?
          </span>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="-ml-0.5 mt-0.5 cursor-pointer appearance-none bg-transparent text-[15px] font-medium text-foreground outline-none"
            aria-label="What is going on with your roof?"
          >
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden w-px self-stretch bg-foreground/10 sm:block" />

        <label className="flex flex-col rounded-2xl bg-muted/60 px-4 py-2.5 text-left focus-within:bg-muted sm:w-40">
          <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            Your ZIP code
          </span>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            placeholder="75201"
            className="mt-0.5 w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-foreground/30 outline-none"
            aria-label="Your ZIP code"
          />
        </label>

        <button
          type="submit"
          disabled={!zipValid || pending}
          className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:py-0"
        >
          {pending ? "Matching..." : "Get my quotes"}
          {!pending && <ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
        </button>
      </div>
    </form>
  )
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
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
