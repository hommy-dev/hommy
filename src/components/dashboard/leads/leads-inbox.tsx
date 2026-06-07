"use client"

import { useState } from "react"
import { LeadCard } from "./lead-card"
import type { DashboardLead } from "@/lib/data/dashboard"
import { cn } from "@/lib/utils"

type Filter = "all" | DashboardLead["urgency"]

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "emergency", label: "Emergency" },
  { key: "within_week", label: "This week" },
  { key: "within_month", label: "This month" },
  { key: "planning", label: "Planning" },
]

export function LeadsInbox({ leads }: { leads: DashboardLead[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const filtered =
    filter === "all" ? leads : leads.filter((l) => l.urgency === filter)

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex flex-wrap gap-2 lg:gap-[0.556vw]">
        {FILTERS.map((f) => {
          const n =
            f.key === "all"
              ? leads.length
              : leads.filter((l) => l.urgency === f.key).length
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-sm lg:text-[0.972vw] transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 lg:ml-[0.417vw] tabular-nums opacity-70">{n}</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg lg:rounded-[0.694vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No leads in this view.
        </div>
      ) : (
        <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}
