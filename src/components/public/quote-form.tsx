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
  { label: "Inspection", subtype: "Inspection" },
] as const

/**
 * Homepage hero teaser: service + rough location, then hands off to the full
 * /get-a-quote wizard (pre-filled) where the exact address is picked.
 */
export function QuoteForm({ className }: { className?: string }) {
  const router = useRouter()
  const [subtype, setSubtype] = useState<string>(SERVICES[0].subtype)
  const [where, setWhere] = useState("")
  const [pending, setPending] = useState(false)
  const whereValid = where.trim().length >= 2

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!whereValid || pending) return
    setPending(true)
    const params = new URLSearchParams({ subtype, where: where.trim() })
    router.push(`/get-a-quote?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-foreground/15 bg-card shadow-sm transition-colors focus-within:border-foreground/30 sm:flex-row sm:items-stretch",
        className,
      )}
    >
      <div className="relative flex items-center border-b border-foreground/10 sm:border-b-0 sm:border-r">
        <select
          value={subtype}
          onChange={(e) => setSubtype(e.target.value)}
          aria-label="Type of work"
          className="h-12 w-full cursor-pointer appearance-none bg-transparent pl-4 pr-9 text-[15px] font-medium text-foreground outline-none"
        >
          {SERVICES.map((s) => (
            <option key={s.subtype} value={s.subtype}>
              {s.label}
            </option>
          ))}
        </select>
        <Chevron className="pointer-events-none absolute right-3 text-foreground/40" />
      </div>

      <input
        value={where}
        onChange={(e) => setWhere(e.target.value.slice(0, 80))}
        placeholder="Your city or ZIP"
        aria-label="Your city or area"
        className="h-12 min-w-0 flex-1 bg-transparent px-4 text-[15px] text-foreground outline-none placeholder:text-foreground/40"
      />

      <button
        type="submit"
        disabled={!whereValid || pending}
        className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-foreground px-6 text-[15px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "Matching…" : "Get quotes"}
        {!pending && <ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
      </button>
    </form>
  )
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3 8h9m0 0l-3.5-3.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
