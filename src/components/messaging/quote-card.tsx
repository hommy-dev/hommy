"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import type { MessageMeta } from "@/lib/db/schema";
import type { ParticipantIdentity } from "@/lib/data/conversations";
import { acceptEstimate } from "@/lib/actions/accept-estimate";
import { getEstimateForViewer, type QuoteDetail } from "@/lib/actions/estimates";
import { showToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
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
            <FileText className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
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

        <div className="mt-3 lg:mt-[0.833vw] flex items-center gap-2 lg:gap-[0.556vw]">
          <ViewQuoteButton estimateId={meta.estimateId} otherName={otherName} />
          {canAccept && !accepted && !superseded ? (
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className="flex-1 rounded-md lg:rounded-[0.417vw] bg-foreground px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
            >
              {pending ? "Accepting…" : "Accept quote"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** "View" trigger + dialog that lazy-loads the full quote (line items, scope). */
function ViewQuoteButton({ estimateId, otherName }: { estimateId: string; otherName?: string }) {
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
        className="flex-1 rounded-md lg:rounded-[0.417vw] border border-border bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw] font-semibold text-foreground transition-colors hover:bg-muted"
      >
        View quote
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md lg:max-w-[30vw]">
          <DialogHeader>
            <DialogTitle>Quote{quote?.contractorName ? ` from ${quote.contractorName}` : ""}</DialogTitle>
            <DialogDescription>
              {otherName ? `Sent in your chat with ${otherName}.` : "Quote details."}
            </DialogDescription>
          </DialogHeader>

          {loading && !quote ? (
            <p className="py-6 lg:py-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
          ) : quote ? (
            <div className="space-y-4 lg:space-y-[1.111vw]">
              <ul className="divide-y divide-border rounded-md lg:rounded-[0.556vw] border border-border">
                {quote.lineItems.map((li, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 lg:gap-[0.833vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw]">
                    <span className="min-w-0 break-words">{li.label}</span>
                    <span className="shrink-0 tabular-nums">{formatCurrency(li.amount)}</span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1 lg:space-y-[0.278vw] rounded-md lg:rounded-[0.556vw] border border-border bg-muted/30 p-3 lg:p-[0.833vw] text-sm lg:text-[0.903vw]">
                {quote.subtotal ? <Row label="Subtotal" value={formatCurrency(quote.subtotal)} /> : null}
                {quote.taxAmount ? <Row label="Tax" value={formatCurrency(quote.taxAmount)} /> : null}
                <div className="flex items-center justify-between pt-1 lg:pt-[0.278vw] font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{quote.total ? formatCurrency(quote.total) : "—"}</dd>
                </div>
              </dl>

              {quote.scopeNotes ? (
                <div>
                  <p className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">Scope</p>
                  <p className="mt-1 lg:mt-[0.278vw] whitespace-pre-wrap text-sm lg:text-[0.903vw]">{quote.scopeNotes}</p>
                </div>
              ) : null}

              {quote.validUntil ? (
                <p className="text-xs lg:text-[0.764vw] text-muted-foreground">
                  Valid until {formatDate(new Date(quote.validUntil))}
                </p>
              ) : null}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
