"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Display label → the roofing service subtype the wizard/createLead expect
// (must match services.subtypes — see scripts/seed.ts).
const SERVICES = [
  { label: "Roof repair", subtype: "Repair" },
  { label: "Full replacement", subtype: "Replacement" },
  { label: "Storm damage", subtype: "Storm Damage" },
  { label: "Roof inspection", subtype: "Inspection" },
] as const

/**
 * Homepage hero teaser. Collects just service + ZIP, then hands off to the full
 * /get-a-quote wizard (pre-filled) which creates the lead and fans it out.
 */
export function QuoteForm({ className }: { className?: string }) {
  const router = useRouter()
  const [subtype, setSubtype] = useState<string>(SERVICES[0].subtype)
  const [zip, setZip] = useState("")
  const [pending, setPending] = useState(false)
  // Permissive postal code — works worldwide, not just US 5-digit ZIPs.
  const zipValid = zip.trim().length >= 2

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!zipValid || pending) return
    setPending(true)
    const params = new URLSearchParams({ subtype, zip: zip.trim() })
    router.push(`/get-a-quote?${params.toString()}`)
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
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className="-ml-0.5 mt-0.5 cursor-pointer appearance-none bg-transparent text-[15px] font-medium text-foreground outline-none"
            aria-label="What is going on with your roof?"
          >
            {SERVICES.map((s) => (
              <option key={s.subtype} value={s.subtype}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden w-px self-stretch bg-foreground/10 sm:block" />

        <label className="flex flex-col rounded-2xl bg-muted/60 px-4 py-2.5 text-left focus-within:bg-muted sm:w-40">
          <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            Your postal code
          </span>
          <input
            value={zip}
            onChange={(e) =>
              setZip(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, "").slice(0, 12))
            }
            placeholder="75201"
            className="mt-0.5 w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-foreground/30 outline-none"
            aria-label="Your postal code"
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
