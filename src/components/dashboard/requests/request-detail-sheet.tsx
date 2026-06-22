"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import type { HomeownerRequestDetail } from "@/lib/data/homeowner";
import { closeRequest, getRequestDetailAction } from "@/lib/actions/requests";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { RatingBadge } from "@/components/contractors/rating-badge";
import { ContractorProfileDialog } from "@/components/contractors/contractor-profile-dialog";
import { InlineReviewForm } from "@/components/reviews/inline-review-form";
import { Stars } from "@/components/reviews/stars";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DetailDialog } from "@/components/ui/detail-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { REQUEST_COLUMNS, REQUEST_META } from "./request-meta";
import { URGENCY_LABEL } from "@/components/dashboard/jobs/board-meta";

// Homeowner-framed labels for the request progress stepper.
const PROGRESS_LABEL: Record<string, string> = {
  posted: "Job posted",
  interested: "Contractors interested",
  quotes: "Quotes received",
  hired: "You hired",
  done: "Job completed",
};

// Plain-language "what's happening + what to do next" line, personalized from the
// request's counts + stage. Includes the anti-leakage nudge at the quote stage.
function whatsNext(d: HomeownerRequestDetail): string {
  const pro = (n: number) => `${n} pro${n === 1 ? "" : "s"}`;
  switch (d.requestStatus) {
    case "posted":
      if (d.viewedCount > 0)
        return `${pro(d.viewedCount)} viewed your job and are deciding. Expect the first messages soon.`;
      return d.matchedCount > 0
        ? `We've shared your job with ${pro(d.matchedCount)}. They'll review it and reach out — usually within a day.`
        : "We're still finding pros in your area — we'll alert you the moment one's available.";
    case "interested":
      return `${pro(d.interestedCount)} reached out to discuss your job. Chat about the details and timing, then ask them to send a quote through Homei.`;
    case "quotes":
      return `You've received ${d.quoteCount} quote${d.quoteCount === 1 ? "" : "s"}. Compare them and accept the one you want right here — accepting hires them and confirms the job on Homei. (Never pay or agree off-platform.)`;
    case "hired":
      return "You hired your pro. They'll reach out to schedule — message them anytime.";
    case "done":
      return "Job complete 🎉 Leave a review to help other homeowners.";
  }
}

const CLOSEABLE = new Set(["posted", "interested", "quotes"]);

export function RequestDetailSheet({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<HomeownerRequestDetail | null>(null);
  const [loading, startLoad] = useTransition();
  const [closing, startClose] = useTransition();

  useEffect(() => {
    if (!open || !leadId) return;
    startLoad(async () => {
      setDetail(await getRequestDetailAction(leadId));
    });
  }, [open, leadId]);

  const shown = detail && detail.leadId === leadId ? detail : null;
  const place = shown ? [shown.city, shown.state].filter(Boolean).join(", ") : "";

  function close() {
    if (!shown || closing) return;
    const id = shown.leadId;
    startClose(async () => {
      const res = await closeRequest(id);
      if (res.ok) {
        showToast("Job closed.", { type: "success" });
        onOpenChange(false);
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={<span className="capitalize">{shown ? (shown.subtype ?? shown.serviceName) : "Request"}</span>}
      headerExtra={
        shown ? (
          <span
            className={cn(
              "inline-flex w-fit rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
              REQUEST_META[shown.requestStatus].pill,
            )}
          >
            {REQUEST_META[shown.requestStatus].label}
          </span>
        ) : null
      }
    >
      <div className="space-y-6 lg:space-y-[1.667vw]">
        {loading && !shown ? (
          <p className="text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
        ) : !shown ? (
          <EmptyState
            size="sm"
            icon="info-square"
            title="This job is no longer available"
            description="It may have been closed already. Close this and pick another from your jobs."
          />
        ) : (
          <>
              <div className="rounded-lg lg:rounded-[0.694vw] border border-primary/20 bg-primary/5 p-4 lg:p-[1.111vw]">
                <p className="text-xs lg:text-[0.764vw] font-medium uppercase tracking-wide text-primary">
                  What’s next
                </p>
                <p className="mt-1.5 lg:mt-[0.417vw] text-sm lg:text-[0.903vw] leading-relaxed text-foreground">
                  {whatsNext(shown)}
                </p>
                {shown.review ? (
                  shown.review.submitted ? (
                    <div className="mt-3 lg:mt-[0.833vw] flex items-center gap-2 lg:gap-[0.556vw]">
                      <Stars rating={shown.review.rating ?? 0} starClassName="lg:size-[1.111vw]" />
                      <span className="text-xs lg:text-[0.833vw] text-muted-foreground">
                        You reviewed {shown.review.contractorName ?? "your contractor"}.
                      </span>
                    </div>
                  ) : (
                    <ReviewPrompt
                      projectId={shown.review.projectId}
                      contractorName={shown.review.contractorName}
                      onDone={() => router.refresh()}
                    />
                  )
                ) : null}
              </div>

              <section className="space-y-3 lg:space-y-[0.833vw]">
                <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                  Request
                </h3>
                <Field label="Work" value={shown.subtypes.join(", ") || shown.serviceName} />
                <Field label="Urgency" value={URGENCY_LABEL[shown.urgency]} />
                <Field label="Location" value={shown.address || place || shown.zipCode || "—"} />
                {shown.notes ? <Field label="Notes" value={shown.notes} /> : null}
              </section>

              <section className="space-y-3 lg:space-y-[0.833vw]">
                <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                  Progress
                </h3>
                <ol className="space-y-2.5 lg:space-y-[0.694vw]">
                  {REQUEST_COLUMNS.map((col, i) => {
                    const idx = REQUEST_COLUMNS.indexOf(shown.requestStatus);
                    const done = i <= idx;
                    return (
                      <li key={col} className="flex items-center gap-2.5 lg:gap-[0.694vw]">
                        <span
                          className={cn(
                            "size-2 lg:size-[0.556vw] shrink-0 rounded-full",
                            done ? "bg-primary" : "bg-muted-foreground/30",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm lg:text-[0.903vw]",
                            done ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {PROGRESS_LABEL[col]}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="space-y-3 lg:space-y-[0.833vw]">
                <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                  Interested contractors ({shown.contractors.length})
                </h3>
                {shown.contractors.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon="time-circle"
                    title="No pros yet"
                    description="No contractors have reached out about this job so far. We'll let you know the moment one does."
                  />
                ) : (
                  <ul className="space-y-3 lg:space-y-[0.833vw]">
                    {shown.contractors.map((c) => (
                      <li
                        key={c.contractorId}
                        className="space-y-2.5 lg:space-y-[0.694vw] rounded-lg lg:rounded-[0.694vw] border border-border bg-card p-4 lg:p-[1.111vw]"
                      >
                        <div className="flex items-start justify-between gap-3 lg:gap-[0.833vw]">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 lg:gap-[0.417vw] font-medium lg:text-[0.972vw]">
                              <span className="truncate">{c.contractorName ?? "Contractor"}</span>
                              {c.verified ? (
                                <Icon name="badge-check" className="size-4 lg:size-[1.111vw] shrink-0 text-success" aria-label="Verified" />
                              ) : null}
                              {c.hasUnread ? (
                                <span aria-label="Unread" className="size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary" />
                              ) : null}
                            </p>
                            <div className="mt-1 lg:mt-[0.278vw]">
                              <RatingBadge avgRating={c.avgRating} totalReviews={c.totalReviews} />
                            </div>
                            {c.yearsInBusiness ? (
                              <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                                {c.yearsInBusiness} year{c.yearsInBusiness === 1 ? "" : "s"} in business
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-right text-sm lg:text-[0.903vw] tabular-nums">
                            {c.quoteStatus
                              ? (c.quoteTotal ? formatCurrency(c.quoteTotal) : "—")
                              : null}
                            <span className="block text-xs lg:text-[0.764vw] font-normal text-muted-foreground">
                              {c.quoteStatus === "accepted" ? "Accepted" : c.quoteStatus ? "Quoted" : "In chat"}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 lg:gap-[0.556vw]">
                          <ContractorProfileDialog
                            contractorId={c.contractorId}
                            contractorName={c.contractorName}
                            triggerClassName={cn(buttonVariants({ variant: "surface", className: "flex-1" }))}
                          />
                          {c.conversationId ? (
                            <Link
                              href={`/homeowner/messages/${c.conversationId}`}
                              className={cn(buttonVariants({ variant: "inverse", }), "flex-1")}
                            >
                              <Icon name="chat" className="size-4 lg:size-[1.111vw]" /> Chat
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {CLOSEABLE.has(shown.requestStatus) ? (
                <section className="border-t border-border pt-4 lg:pt-[1.111vw]">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        disabled={closing}
                        className="w-full rounded-md lg:rounded-[0.417vw] border border-border px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-60"
                      >
                        {closing ? "Closing…" : "Close job"}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Close this job?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This stops new pros from being matched and ends any open
                          conversations for this job. You can’t undo it — post a new
                          job if you change your mind.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it open</AlertDialogCancel>
                        <AlertDialogAction onClick={close}>Close job</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </section>
              ) : null}
          </>
        )}
      </div>
    </DetailDialog>
  );
}

/** "Leave a review" button → dialog with the inline star form. */
function ReviewPrompt({
  projectId,
  contractorName,
  onDone,
}: {
  projectId: string;
  contractorName: string | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-3 lg:mt-[0.833vw] inline-flex items-center justify-center rounded-md lg:rounded-[0.417vw] bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Leave a review
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md lg:max-w-[28vw]">
        <DialogHeader>
          <DialogTitle>Review {contractorName ?? "your contractor"}</DialogTitle>
        </DialogHeader>
        <InlineReviewForm
          projectId={projectId}
          contractorName={contractorName}
          onSubmitted={() => {
            setOpen(false);
            onDone();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs lg:text-[0.764vw] text-muted-foreground">{label}</p>
      <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.903vw] text-foreground break-words">
        {value}
      </p>
    </div>
  );
}
