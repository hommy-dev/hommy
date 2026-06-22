"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { MessageMeta } from "@/lib/db/schema";
import type { ParticipantIdentity } from "@/lib/data/conversations";
import { acceptEstimate } from "@/lib/actions/accept-estimate";
import { getEstimateForViewer, type QuoteDetail } from "@/lib/actions/estimates";
import { showToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/format";
import { QuoteDocument } from "@/components/quote/quote-document";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * A quote rendered inline in the thread. Always contractor-sent, so it sits on
 * the contractor's side (`mine`) and on the homeowner's left. The homeowner can
 * Accept here; both parties can View the full line items. Status copy is
 * personalized per viewer. Acceptance is re-checked server-side.
 */
export function QuoteCard({
  meta,
  viewerType,
  mine,
  otherName,
}: {
  meta: Extract<MessageMeta, { kind: "quote" }>;
  viewerType?: ParticipantIdentity["type"];
  mine?: boolean;
  otherName?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const canAccept = viewerType === "user";
  const accepted = meta.status === "accepted";
  const superseded = meta.status === "rejected";

  function accept() {
    if (pending) return;
    start(async () => {
      const res = await acceptEstimate(meta.estimateId);
      if (res.ok) {
        showToast("Quote accepted — you're hired!", { type: "success" });
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  const statusText = accepted
    ? "Accepted"
    : superseded
      ? "Replaced by a newer quote"
      : canAccept
        ? "Awaiting your decision"
        : "Awaiting the homeowner’s decision";

  return (
    <div className={cn("flex py-1.5 lg:py-[0.417vw]", mine ? "justify-end" : "justify-start")}>
      <div className="w-full max-w-[20rem] lg:max-w-[22vw] rounded-lg lg:rounded-[0.694vw] border border-border bg-card p-4 lg:p-[1.111vw]">
        <div className="flex items-center gap-2 lg:gap-[0.556vw]">
          <span className="grid size-8 lg:size-[2.222vw] place-items-center rounded-md lg:rounded-[0.556vw] bg-muted text-muted-foreground">
            <Icon name="document" className="size-4 lg:size-[1.111vw]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm lg:text-[0.903vw] font-semibold">Quote</p>
            <p
              className={cn(
                "text-xs lg:text-[0.764vw]",
                accepted ? "text-success" : superseded ? "text-muted-foreground line-through" : "text-muted-foreground",
              )}
            >
              {statusText}
            </p>
          </div>
          <span className="ml-auto text-base lg:text-[1.111vw] font-semibold tabular-nums">
            {meta.total ? formatCurrency(meta.total) : "—"}
          </span>
        </div>

        <div className="mt-3 lg:mt-[1.2vw] flex items-center gap-2 lg:gap-[0.556vw]">
          <ViewQuoteButton estimateId={meta.estimateId} viewerType={viewerType} otherName={otherName} />
          {canAccept && !accepted && !superseded ? (
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className={buttonVariants({ variant: "inverse", className: "flex-1" })}
            >
              {pending ? "Accepting…" : "Accept quote"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** "View" trigger + dialog that lazy-loads the full quote as a branded document. */
function ViewQuoteButton({
  estimateId,
  viewerType,
  otherName,
}: {
  estimateId: string;
  viewerType?: ParticipantIdentity["type"];
  otherName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, start] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !quote) {
      start(async () => {
        const res = await getEstimateForViewer(estimateId);
        if (res.ok) setQuote(res.quote);
        else showToast(res.message, { type: "error" });
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className={cn(buttonVariants({ variant: "surface", className: "flex-1" }))}
      >
        View quote
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md lg:max-w-[40vw] max-h-[90vh] gap-0 overflow-y-auto"
        >
          <DialogClose className="absolute top-2 right-2 lg:top-[0.3vw] lg:right-[0vw] z-10 grid size-8 lg:size-[2.222vw] place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Icon name="close" className="size-4 lg:size-[1.111vw]" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="sr-only">
            <DialogTitle>Quote{quote?.contractorName ? ` from ${quote.contractorName}` : ""}</DialogTitle>
            <DialogDescription>
              {otherName ? `Sent in your chat with ${otherName}.` : "Quote details."}
            </DialogDescription>
          </DialogHeader>

          {loading && !quote ? (
            <p className="py-6 lg:py-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
          ) : quote ? (
            <div className="space-y-3 lg:space-y-[0.833vw]">
            <QuoteDocument
              data={{
                estimateId: quote.estimateId,
                status: quote.status,
                company: {
                  name: quote.contractorName,
                  logoUrl: quote.company.logoUrl,
                  licenseNumber: quote.company.licenseNumber,
                  insuranceProvider: quote.company.insuranceProvider,
                  yearsInBusiness: quote.company.yearsInBusiness,
                  verified: quote.company.verified,
                  avgRating: quote.company.avgRating,
                  totalReviews: quote.company.totalReviews,
                },
                serviceName: quote.serviceName,
                subtype: quote.subtype,
                // Only the contractor sees a "Prepared for" line; for the
                // homeowner the quote is theirs, so we omit it.
                clientName: viewerType === "user" ? null : otherName ?? null,
                issuedAt: quote.issuedAt,
                validUntil: quote.validUntil,
                lineItems: quote.lineItems,
                subtotal: quote.subtotal,
                taxRate: quote.taxRate,
                taxAmount: quote.taxAmount,
                total: quote.total,
                scopeNotes: quote.scopeNotes,
                warranty: quote.warranty,
              }}
            />
            <a
              href={`/api/quotes/${quote.estimateId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
            >
              Download PDF
            </a>
            </div>
          ) : (
            <p className="py-6 lg:py-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">
              Could not load this quote.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
