"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PanelRightOpen } from "lucide-react";
import type { JobPanel } from "@/lib/data/jobs";
import { acceptEstimate } from "@/lib/actions/accept-estimate";
import { advanceProjectStage } from "@/lib/actions/projects";
import { showToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuoteBuilderDialog } from "@/components/dashboard/estimates/quote-builder-dialog";
import { JobDetailContent } from "@/components/dashboard/jobs/job-detail-content";
import { BOARD_META } from "@/components/dashboard/jobs/board-meta";

/**
 * The chat "control room" bar: a slim row under the header with the job status,
 * the quote total, the action this viewer may take, and a Details button that
 * opens the full job detail in a right-side Sheet. Actions are gated on the
 * panel's server-resolved permissions, never the URL.
 */
export function JobControlPanel({ panel }: { panel: JobPanel }) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, start] = useTransition();
  const { detail } = panel;
  const meta = BOARD_META[detail.boardStatus];
  const quote = detail.latestQuote;

  function accept() {
    if (pending || !quote) return;
    start(async () => {
      const res = await acceptEstimate(quote.estimateId);
      if (res.ok) {
        showToast("Quote accepted — you're hired!", { type: "success" });
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  function markCompleted() {
    if (pending || !detail.projectId) return;
    start(async () => {
      const res = await advanceProjectStage(detail.projectId!, "completed");
      if (res.ok) {
        showToast("Marked completed — we’ll ask the homeowner for a review.", { type: "success" });
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  return (
    <div className="flex items-center gap-3 lg:gap-[0.833vw] border-b border-border bg-muted/30 px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw]">
      <span
        className={cn(
          "shrink-0 rounded-full px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
          meta.pill,
        )}
      >
        {meta.label}
      </span>
      <span className="hidden min-w-0 flex-1 truncate text-sm lg:text-[0.903vw] text-muted-foreground sm:block">
        {detail.lead.subtypes.join(", ") || detail.serviceName}
      </span>
      {quote ? (
        <span className="shrink-0 text-sm lg:text-[0.903vw] font-semibold tabular-nums">
          {quote.total ? formatCurrency(quote.total) : "—"}
        </span>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-[0.556vw] sm:ml-0">
        {panel.canAccept ? (
          <button
            type="button"
            onClick={accept}
            disabled={pending}
            className="rounded-md lg:rounded-[0.417vw] bg-foreground px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
          >
            {pending ? "Accepting…" : "Accept quote"}
          </button>
        ) : null}
        {panel.canQuote && detail.projectId ? (
          <QuoteBuilderDialog
            projectId={detail.projectId}
            triggerLabel={quote ? "Update quote" : "Send quote"}
          />
        ) : null}
        {panel.canComplete ? (
          <button
            type="button"
            onClick={markCompleted}
            disabled={pending}
            className="rounded-md lg:rounded-[0.417vw] border border-border bg-card px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            {pending ? "Saving…" : "Mark completed"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] border border-border px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PanelRightOpen className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Details
        </button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="data-[side=right]:sm:max-w-md lg:data-[side=right]:sm:max-w-[34vw]">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="pr-8 lg:pr-[2.5vw]">
              {panel.viewerRole === "contractor"
                ? (detail.homeowner.name ?? "Job details")
                : "Job details"}
            </SheetTitle>
            <div className="flex items-center gap-2 lg:gap-[0.556vw]">
              <span
                className={cn(
                  "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
                  meta.pill,
                )}
              >
                {meta.label}
              </span>
              <span className="text-sm lg:text-[0.903vw] text-muted-foreground">
                {detail.serviceName}
              </span>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 lg:p-[1.667vw]">
            <JobDetailContent detail={detail} showHomeowner={panel.viewerRole === "contractor"} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
