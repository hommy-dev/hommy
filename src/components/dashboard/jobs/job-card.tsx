"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { MessageSquare } from "lucide-react";
import type { JobCard as Job } from "@/lib/data/jobs";
import { engageLead } from "@/lib/actions/engage";
import { showToast } from "@/components/ui/toast";
import { formatDistanceToNow, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SlaCountdown } from "../leads/sla-countdown";
import { DeclineLeadDialog } from "../leads/decline-lead-dialog";
import { BOARD_META, URGENCY_LABEL, URGENCY_PILL } from "./board-meta";

export function JobCard({
  job,
  canEngage,
  onView,
}: {
  job: Job;
  canEngage: boolean;
  onView: (leadId: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const meta = BOARD_META[job.boardStatus];
  const location = [job.city, job.state].filter(Boolean).join(", ") || job.zipCode || "Location hidden";
  const isNew = job.boardStatus === "new";

  function startChat() {
    if (pending) return;
    start(async () => {
      const res = await engageLead(job.leadId);
      if (res.ok) {
        router.push(`/contractor/messages/${res.conversationId}`);
        return;
      }
      if (res.error === "INSUFFICIENT_CREDITS") {
        showToast(res.message, {
          type: "warning",
          actionLabel: "Buy credits",
          onAction: () => router.push("/contractor/settings/billing"),
        });
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  return (
    <article className="rounded-lg lg:rounded-[0.694vw] border border-border bg-card p-4 lg:p-[1.111vw] transition-colors hover:border-foreground/25">
      <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
        <span
          className={cn(
            "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
            meta.pill,
          )}
        >
          {meta.label}
        </span>
        <div className="flex items-center gap-2 lg:gap-[0.556vw]">
          {job.hasUnread ? (
            <span aria-label="Unread message" className="size-2 lg:size-[0.556vw] rounded-full bg-primary" />
          ) : null}
          <span
            className={cn(
              "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
              URGENCY_PILL[job.urgency],
            )}
          >
            {URGENCY_LABEL[job.urgency]}
          </span>
        </div>
      </div>

      <div className="mt-3 lg:mt-[0.833vw]">
        <p className="truncate font-semibold lg:text-[1.042vw]">
          {job.homeownerName ?? "New homeowner"}
        </p>
        <p className="mt-0.5 lg:mt-[0.139vw] truncate text-sm lg:text-[0.903vw] text-muted-foreground">
          {job.subtype ?? job.serviceName}
        </p>
      </div>

      <div className="mt-2.5 lg:mt-[0.694vw] flex items-center justify-between gap-2 lg:gap-[0.556vw] text-xs lg:text-[0.833vw] text-muted-foreground">
        <span className="truncate">{location}</span>
        {isNew && job.slaDeadline ? (
          <SlaCountdown deadline={job.slaDeadline} compact className="shrink-0 text-xs lg:text-[0.833vw]" />
        ) : (
          <span className="shrink-0">{formatDistanceToNow(new Date(job.engagedAt ?? job.offeredAt))}</span>
        )}
      </div>

      {job.latestQuoteTotal && !isNew ? (
        <p className="mt-2.5 lg:mt-[0.694vw] text-sm lg:text-[0.903vw] font-medium tabular-nums">
          {formatCurrency(job.latestQuoteTotal)}
        </p>
      ) : null}

      <div className="mt-3 lg:mt-[0.833vw] flex items-center gap-2 lg:gap-[0.556vw] border-t border-border pt-3 lg:pt-[0.833vw]">
        {isNew ? (
          <button
            type="button"
            onClick={startChat}
            disabled={pending || !canEngage}
            className="inline-flex flex-1 items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] bg-foreground px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
            {pending ? "Starting…" : `Chat with homeowner · ${job.engagementCreditCost} cr`}
          </button>
        ) : job.conversationId ? (
          <Link
            href={`/contractor/messages/${job.conversationId}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] border border-border bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw] font-semibold transition-colors hover:bg-muted"
          >
            <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Open chat
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => onView(job.leadId)}
          className="rounded-md lg:rounded-[0.417vw] border border-border px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Details
        </button>

        {isNew ? <DeclineLeadDialog leadId={job.leadId} /> : null}
      </div>
    </article>
  );
}
