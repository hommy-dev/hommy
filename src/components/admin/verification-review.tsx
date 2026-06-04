"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { decideVerification } from "@/lib/actions/admin"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import type { VerificationQueueItem } from "@/lib/data/admin"

function isImageUrl(u: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(u.split("?")[0])
}

function DocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-foreground/80">{label}</p>
      {!url ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          Not provided
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
          {isImageUrl(url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="mx-auto max-h-48 w-full object-contain" />
          ) : (
            <iframe src={url} title={label} className="h-48 w-full" />
          )}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block border-t border-border px-3 py-2 text-center text-xs font-medium text-primary hover:underline"
          >
            Open full document
          </a>
        </div>
      )}
    </div>
  )
}

export function VerificationReviewCard({ item }: { item: VerificationQueueItem }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function decide(decision: "verified" | "rejected") {
    start(async () => {
      const res = await decideVerification({ contractorId: item.contractorId, decision })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast(
        decision === "verified" ? "Company verified" : "Company rejected",
        { type: "success" },
      )
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sebenta text-lg font-bold tracking-tight">
            {item.companyName ?? "Unnamed company"}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.ownerName ?? "Unknown owner"}
            {item.ownerEmail ? ` · ${item.ownerEmail}` : ""}
          </p>
          {item.licenseNumber ? (
            <p className="mt-1 text-xs text-muted-foreground">
              License #{item.licenseNumber}
              {item.insuranceProvider ? ` · ${item.insuranceProvider}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => decide("rejected")}
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => decide("verified")}
          >
            {pending ? "Saving…" : "Approve"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DocPreview label="License document" url={item.licenseDocUrl} />
        <DocPreview label="Insurance certificate" url={item.insuranceDocUrl} />
      </div>
    </section>
  )
}
