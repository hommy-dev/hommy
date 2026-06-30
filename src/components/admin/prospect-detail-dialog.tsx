"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DetailDialog } from "@/components/ui/detail-dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { showToast } from "@/components/ui/toast"
import { formatDistanceToNow } from "@/lib/format"
import {
  getProspectDetailAction,
  suppressProspect,
  requeueProspectEnrichment,
} from "@/lib/actions/recruitment"
import type { ProspectRow, ProspectDetail } from "@/lib/data/admin-recruitment"
import { Pill } from "./leads-table"

type PillStyle = { label: string; cls: string }
const MUTED = "bg-muted text-muted-foreground"
const SKY = "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
const EMERALD = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
const AMBER = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
const RED = "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
const VIOLET = "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"

const ENRICH_STYLE: Record<string, PillStyle> = {
  discovered: { label: "Discovered", cls: MUTED },
  enriching: { label: "Enriching", cls: SKY },
  email_found: { label: "Email found", cls: EMERALD },
  email_verified: { label: "Email verified", cls: EMERALD },
  no_email: { label: "No email", cls: AMBER },
  failed: { label: "Failed", cls: RED },
}

const OUTREACH_STYLE: Record<string, PillStyle> = {
  pending: { label: "Pending", cls: MUTED },
  exported: { label: "Exported", cls: SKY },
  sent: { label: "Sent", cls: SKY },
  opened: { label: "Opened", cls: VIOLET },
  clicked: { label: "Clicked", cls: VIOLET },
  replied: { label: "Replied", cls: EMERALD },
  converted: { label: "Converted", cls: EMERALD },
  bounced: { label: "Bounced", cls: RED },
  suppressed: { label: "Suppressed", cls: AMBER },
  skipped: { label: "Skipped", cls: MUTED },
}

export function enrichPill(status: string): PillStyle {
  return ENRICH_STYLE[status] ?? { label: status, cls: MUTED }
}
export function outreachPill(status: string): PillStyle {
  return OUTREACH_STYLE[status] ?? { label: status, cls: MUTED }
}

const JOB_STYLE: Record<string, PillStyle> = {
  queued: { label: "Queued", cls: MUTED },
  claimed: { label: "Processing", cls: SKY },
  done: { label: "Done", cls: EMERALD },
  error: { label: "Error", cls: RED },
}

function withScheme(url: string): string {
  return url.includes("://") ? url : `https://${url}`
}

export function ProspectDetailDialog({
  prospect,
  open,
  onOpenChange,
}: {
  prospect: ProspectRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [detail, setDetail] = useState<ProspectDetail | null>(null)
  const [loading, startLoad] = useTransition()
  const [acting, startAction] = useTransition()

  function reload(id: string) {
    startLoad(async () => setDetail(await getProspectDetailAction(id)))
  }

  useEffect(() => {
    if (!open || !prospect) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the opened prospect changes
    setDetail(null)
    reload(prospect.id)
  }, [open, prospect])

  function copyEmail() {
    const email = detail?.email
    if (!email) return
    void navigator.clipboard?.writeText(email).then(
      () => showToast("Email copied.", { type: "success" }),
      () => showToast("Couldn't copy.", { type: "error" }),
    )
  }

  function requeue() {
    if (!detail || acting) return
    startAction(async () => {
      const res = await requeueProspectEnrichment({ id: detail.id })
      if (res.success) {
        showToast("Re-queued for enrichment.", { type: "success" })
        reload(detail.id)
        router.refresh()
      } else showToast(res.error, { type: "error" })
    })
  }

  function suppress() {
    if (!detail || acting) return
    if (!confirm("Stop all outreach to this prospect?")) return
    startAction(async () => {
      const res = await suppressProspect({ id: detail.id })
      if (res.success) {
        showToast("Prospect suppressed.", { type: "success" })
        reload(detail.id)
        router.refresh()
      } else showToast(res.error, { type: "error" })
    })
  }

  const jobBusy = detail?.job?.status === "queued" || detail?.job?.status === "claimed"
  const canSuppress =
    detail && detail.outreachStatus !== "suppressed" && detail.outreachStatus !== "converted"

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={prospect?.companyName ?? detail?.companyName ?? "Prospect"}
      headerExtra={
        detail ? (
          <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
            <Pill {...enrichPill(detail.enrichmentStatus)} />
            <Pill {...outreachPill(detail.outreachStatus)} />
          </div>
        ) : null
      }
      footer={
        detail ? (
          <div className="flex flex-wrap items-center justify-end gap-2 lg:gap-[0.556vw]">
            {detail.email ? (
              <Button  variant="outline" onClick={copyEmail} disabled={acting}>
                Copy email
              </Button>
            ) : null}
            <Button  variant="surface" onClick={requeue} disabled={acting || jobBusy}>
              {jobBusy ? "Enriching…" : "Re-run enrichment"}
            </Button>
            {canSuppress ? (
              <Button  variant="destructive" onClick={suppress} disabled={acting}>
                Suppress
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {loading && !detail ? (
        <p className="py-8 lg:py-[2.222vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">
          Loading…
        </p>
      ) : !detail ? (
        <EmptyState
          size="sm"
          icon="danger-triangle"
          title="We couldn't load this prospect"
          description="Something went wrong. Close this and try again."
        />
      ) : (
        <div className="space-y-6 lg:space-y-[1.667vw]">
          {/* Snapshot */}
          <section className="rounded-lg lg:rounded-[0.694vw] border border-border bg-muted/30 p-4 lg:p-[1.111vw]">
            <dl className="flex flex-wrap gap-x-6 gap-y-2 lg:gap-x-[1.667vw] text-sm lg:text-[0.903vw]">
              <Field label="Location" value={[detail.city, detail.state].filter(Boolean).join(", ") || "—"} />
              <Field
                label="Google rating"
                value={detail.rating ? `${Number(detail.rating).toFixed(1)} (${detail.reviewCount ?? 0})` : "—"}
              />
              <Field label="Emails sent" value={String(detail.outreachCount)} />
              <Field label="Source" value={detail.source} />
              <Field label="Discovered" value={formatDistanceToNow(new Date(detail.createdAt))} />
            </dl>
          </section>

          {/* Contact */}
          <section className="space-y-2 lg:space-y-[0.556vw]">
            <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">Contact</h3>
            <dl className="space-y-2 lg:space-y-[0.556vw] text-sm lg:text-[0.903vw]">
              <Row label="Email">
                {detail.email ? (
                  <span className="flex items-center gap-2 lg:gap-[0.556vw]">
                    <span className="font-medium text-foreground">{detail.email}</span>
                    {detail.emailConfidence != null ? (
                      <span className="text-xs lg:text-[0.764vw] text-muted-foreground">
                        {detail.emailConfidence}% confidence
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not found</span>
                )}
              </Row>
              <Row label="Phone">{detail.phone ?? <span className="text-muted-foreground">—</span>}</Row>
              <Row label="Website">
                {detail.website ? (
                  <a
                    href={withScheme(detail.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {detail.domain ?? detail.website}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Row>
            </dl>
          </section>

          {/* Enrichment job */}
          <section className="space-y-2 lg:space-y-[0.556vw]">
            <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
              Email enrichment
            </h3>
            {detail.job ? (
              <div className="space-y-2 lg:space-y-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-border p-3 lg:p-[0.833vw]">
                <div className="flex items-center justify-between text-sm lg:text-[0.903vw]">
                  <Pill {...(JOB_STYLE[detail.job.status] ?? { label: detail.job.status, cls: MUTED })} />
                  <span className="text-muted-foreground">
                    {detail.job.attempts} attempt{detail.job.attempts === 1 ? "" : "s"} ·{" "}
                    {formatDistanceToNow(new Date(detail.job.updatedAt))}
                  </span>
                </div>
                {detail.job.lastError ? (
                  <p className="rounded-md lg:rounded-[0.417vw] bg-destructive-bg px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] font-mono text-xs lg:text-[0.764vw] text-destructive">
                    {detail.job.lastError}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
                No enrichment job (no website to crawl).
              </p>
            )}
          </section>

          {/* Conversion */}
          {detail.converted ? (
            <section className="rounded-md lg:rounded-[0.556vw] border border-success/30 bg-success-bg px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.903vw]">
              <span className="font-medium text-foreground">
                Converted → {detail.convertedContractor?.companyName ?? "contractor"}
              </span>
              {detail.convertedAt ? (
                <span className="ml-2 lg:ml-[0.556vw] text-muted-foreground">
                  {formatDistanceToNow(new Date(detail.convertedAt))}
                </span>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </DetailDialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 lg:gap-[1.111vw]">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}
