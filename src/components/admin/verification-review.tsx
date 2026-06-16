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
      <p className="mb-1.5 lg:mb-[0.417vw] text-xs lg:text-[0.833vw] font-medium text-foreground/80">{label}</p>
      {!url ? (
        <div className="flex h-40 lg:h-[11.111vw] items-center justify-center rounded-md lg:rounded-[0.4vw] border border-dashed border-border text-xs lg:text-[0.833vw] text-muted-foreground">
          Not provided
        </div>
      ) : (
        <div className="overflow-hidden rounded-md lg:rounded-[0.4vw] border border-border bg-muted/30">
          {isImageUrl(url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="mx-auto max-h-48 lg:max-h-[13.333vw] w-full object-contain" />
          ) : (
            <iframe src={url} title={label} className="h-48 lg:h-[13.333vw] w-full" />
          )}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block border-t border-border px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-center text-xs lg:text-[0.833vw] font-medium text-primary hover:underline"
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
    <section className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <div className="flex flex-wrap items-start justify-between gap-3 lg:gap-[0.833vw]">
        <div className="min-w-0">
          <h3 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
            {item.companyName ?? "Unnamed company"}
          </h3>
          <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            {item.ownerName ?? "Unknown owner"}
            {item.ownerEmail ? ` · ${item.ownerEmail}` : ""}
          </p>
          {item.licenseNumber ? (
            <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.833vw] text-muted-foreground">
              License #{item.licenseNumber}
              {item.insuranceProvider ? ` · ${item.insuranceProvider}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 lg:gap-[0.556vw]">
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

      <div className="mt-4 lg:mt-[1.111vw] grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
        <DocPreview label="License document" url={item.licenseDocUrl} />
        <DocPreview label="Insurance certificate" url={item.insuranceDocUrl} />
      </div>
    </section>
  )
}
