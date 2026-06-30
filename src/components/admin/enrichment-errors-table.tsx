"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { showToast } from "@/components/ui/toast"
import { formatDistanceToNow } from "@/lib/format"
import { requeueProspectEnrichment } from "@/lib/actions/recruitment"
import type { EnrichmentErrorRow } from "@/lib/data/admin-recruitment"
import { Th, Td } from "./leads-table"

export function EnrichmentErrorsTable({ rows }: { rows: EnrichmentErrorRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon="tick-square"
        title="No enrichment errors"
        description="Every email-finding job that ran either found an email or cleanly found none. Nothing to retry."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm lg:text-[0.903vw]">
        <thead>
          <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
            <Th className="pl-5 lg:pl-[1.528vw]">Company</Th>
            <Th className="text-right">Attempts</Th>
            <Th>Last error</Th>
            <Th>When</Th>
            <Th><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <ErrorRow key={r.prospectId} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErrorRow({ row }: { row: EnrichmentErrorRow }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function requeue() {
    start(async () => {
      const res = await requeueProspectEnrichment({ id: row.prospectId })
      if (res.success) {
        showToast("Re-queued for enrichment.", { type: "success" })
        router.refresh()
      } else showToast(res.error, { type: "error" })
    })
  }

  return (
    <tr className="align-middle">
      <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">{row.companyName ?? "Unnamed company"}</Td>
      <Td className="text-right tabular-nums text-muted-foreground">{row.attempts}</Td>
      <Td className="max-w-[24rem] truncate font-mono text-xs lg:text-[0.764vw] text-destructive">
        {row.lastError ?? "—"}
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(row.updatedAt))}</Td>
      <Td className="text-right">
        <Button size="xs" variant="surface" onClick={requeue} disabled={pending}>
          {pending ? "…" : "Re-queue"}
        </Button>
      </Td>
    </tr>
  )
}
