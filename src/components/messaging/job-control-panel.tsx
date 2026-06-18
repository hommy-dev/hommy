"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PanelRightOpen } from "lucide-react";
import type { JobPanel } from "@/lib/data/jobs";
import { acceptEstimate } from "@/lib/actions/accept-estimate";
import { advanceProjectStage } from "@/lib/actions/projects";
import { showToast } from "@/components/ui/toast";
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
 * The chat "control room" controls: a compact inline cluster shown on the RIGHT
 * of the conversation header — the job status, the quote total, the action this
 * viewer may take, and a Details button that opens the full job detail in a
 * right-side Sheet. Actions are gated on the panel's server-resolved
 * permissions, never the URL.
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

  // One size for every button in the cluster so the row reads as a set.
  const btnBase =
    "inline-flex h-8 lg:h-[2.222vw] shrink-0 items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] px-3 lg:px-[0.833vw] text-sm lg:text-[0.833vw] font-medium transition-colors disabled:opacity-60";
  const btnPrimary = cn(btnBase, "bg-primary text-primary-foreground hover:bg-primary/90");
  const btnOutline = cn(btnBase, "border border-border bg-card text-foreground hover:bg-muted");

  return (
    <div className="flex shrink-0 items-center gap-2 lg:gap-[0.556vw]">
      {panel.canAccept ? (
        <button type="button" onClick={accept} disabled={pending} className={btnPrimary}>
          {pending ? "Accepting…" : "Accept quote"}
        </button>
      ) : null}
      {panel.canQuote && detail.projectId ? (
        <QuoteBuilderDialog
          projectId={detail.projectId}
          triggerLabel={quote ? "Update quote" : "Send quote"}
          triggerClassName={btnPrimary}
          initialItems={
            quote
              ? detail.estimates[0]?.lineItems.map((li) => ({ label: li.label, amount: String(li.amount) }))
              : undefined
          }
          initialScopeNotes={quote ? detail.estimates[0]?.scopeNotes : undefined}
        />
      ) : null}
      {panel.canComplete ? (
        <button type="button" onClick={markCompleted} disabled={pending} className={btnOutline}>
          {pending ? "Saving…" : "Mark completed"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={cn(btnOutline, "text-muted-foreground hover:text-foreground")}
      >
        <PanelRightOpen className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Details
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="data-[side=right]:sm:max-w-lg lg:data-[side=right]:sm:max-w-[40vw]">
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
            <JobDetailContent
              detail={detail}
              showHomeowner={panel.viewerRole === "contractor"}
              viewerRole={panel.viewerRole}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
