"use client"

import { useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDistanceToNow } from "@/lib/format"
import type { ProspectRow } from "@/lib/data/admin-recruitment"
import { SearchBox, Th, Td, Pill } from "./leads-table"
import { ProspectDetailDialog, enrichPill, outreachPill } from "./prospect-detail-dialog"

const ENRICH_FILTERS = ["all", "email_found", "email_verified", "discovered", "no_email", "failed"] as const
const OUTREACH_FILTERS = ["all", "pending", "sent", "converted", "bounced", "suppressed", "skipped"] as const

export function ProspectsTable({ prospects }: { prospects: ProspectRow[] }) {
  const [query, setQuery] = useState("")
  const [enrich, setEnrich] = useState<string>("all")
  const [outreach, setOutreach] = useState<string>("all")
  const [open, setOpen] = useState<ProspectRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return prospects.filter((p) => {
      if (enrich !== "all" && p.enrichmentStatus !== enrich) return false
      if (outreach !== "all" && p.outreachStatus !== outreach) return false
      if (q && ![p.companyName, p.city, p.state, p.email].filter(Boolean).join(" ").toLowerCase().includes(q))
        return false
      return true
    })
  }, [prospects, query, enrich, outreach])

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex flex-wrap items-center gap-3 lg:gap-[0.833vw]">
        <SearchBox value={query} onChange={setQuery} placeholder="Search company, city, email…" />
        <FilterSelect value={enrich} onChange={setEnrich} options={ENRICH_FILTERS} allLabel="All enrichment" />
        <FilterSelect value={outreach} onChange={setOutreach} options={OUTREACH_FILTERS} allLabel="All outreach" />
        <span className="ml-auto text-xs lg:text-[0.764vw] text-muted-foreground tabular-nums">
          {filtered.length} of {prospects.length}
        </span>
      </div>

      {prospects.length === 0 ? (
        <EmptyState
          size="sm"
          icon="discovery"
          title="No prospects yet"
          description="Run “Find roofers” on an uncovered area — discovered companies show up here, then get enriched and emailed."
        />
      ) : filtered.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No prospects match" description="Try a different search or filter." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[60rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Company</Th>
                <Th>Location</Th>
                <Th>Email</Th>
                <Th>Enrichment</Th>
                <Th>Outreach</Th>
                <Th className="text-right">Sent</Th>
                <Th>Rating</Th>
                <Th>Discovered</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const place = [p.city, p.state].filter(Boolean).join(", ") || "—"
                return (
                  <tr
                    key={p.id}
                    onClick={() => setOpen(p)}
                    className="cursor-pointer align-middle transition-colors hover:bg-muted/40"
                  >
                    <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">
                      {p.companyName ?? "Unnamed company"}
                    </Td>
                    <Td className="text-muted-foreground">{place}</Td>
                    <Td className="max-w-[16rem] truncate text-muted-foreground">{p.email ?? "—"}</Td>
                    <Td><Pill {...enrichPill(p.enrichmentStatus)} /></Td>
                    <Td><Pill {...outreachPill(p.outreachStatus)} /></Td>
                    <Td className="text-right tabular-nums text-muted-foreground">{p.outreachCount}</Td>
                    <Td className="tabular-nums text-muted-foreground">
                      {p.rating ? `${Number(p.rating).toFixed(1)}${p.reviewCount ? ` (${p.reviewCount})` : ""}` : "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDistanceToNow(new Date(p.createdAt))}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProspectDetailDialog prospect={open} open={open !== null} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  allLabel: string
}) {
  const label = (o: string) =>
    o === "all" ? allLabel : o.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="capitalize">
            {label(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
