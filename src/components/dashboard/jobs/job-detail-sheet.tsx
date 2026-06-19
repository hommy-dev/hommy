"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { JobDetail } from "@/lib/data/jobs";
import { getJobDetailAction } from "@/lib/actions/jobs";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DetailDialog } from "@/components/ui/detail-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DeclineLeadDialog } from "../leads/decline-lead-dialog";
import { JobDetailContent } from "./job-detail-content";
import { EngageConfirm } from "./engage-confirm";
import { BOARD_META } from "./board-meta";

export function JobDetailSheet({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    if (!open || !leadId) return;
    startLoad(async () => {
      setDetail(await getJobDetailAction(leadId));
    });
  }, [open, leadId]);

  // Only show data that matches the currently-open lead (avoids a stale flash
  // when switching cards without clearing state inside the effect).
  const shown = detail && detail.leadId === leadId ? detail : null;

  const isNew = shown?.boardStatus === "new";

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={shown?.homeowner.name ?? "Job details"}
      headerExtra={
        shown ? (
          <div className="flex items-center gap-2 lg:gap-[0.556vw]">
            <span
              className={cn(
                "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
                BOARD_META[shown.boardStatus].pill,
              )}
            >
              {BOARD_META[shown.boardStatus].label}
            </span>
            <span className="text-sm lg:text-[0.903vw] text-muted-foreground">
              {shown.serviceName}
            </span>
          </div>
        ) : null
      }
      footer={
        shown ? (
          isNew ? (
            <div className="flex items-center gap-2 lg:gap-[0.556vw]">
              <EngageConfirm
                leadId={shown.leadId}
                engagementCreditCost={shown.engagementCreditCost}
                triggerClassName={buttonVariants({ variant: "inverse", size: "lg", className: "flex-1 font-semibold" })}
                triggerContent={
                  <>
                    <Icon name="chat" className="size-4 lg:size-[1.111vw]" />
                    {`Chat with homeowner · ${shown.engagementCreditCost} credit${shown.engagementCreditCost === 1 ? "" : "s"}`}
                  </>
                }
              />
              <DeclineLeadDialog
                leadId={shown.leadId}
                triggerClassName={cn(buttonVariants({ variant: "surface", size: "lg", className: "shrink-0 font-semibold text-muted-foreground" }))}
              />
            </div>
          ) : shown.conversationId ? (
            <Link
              href={`/contractor/messages/${shown.conversationId}`}
              className={cn(buttonVariants({ variant: "inverse", size: "lg" }), "w-full font-semibold")}
            >
              <Icon name="chat" className="size-4 lg:size-[1.111vw]" /> Open chat
            </Link>
          ) : null
        ) : null
      }
    >
      {loading && !shown ? (
        <p className="text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
      ) : !shown ? (
        <EmptyState
          size="sm"
          icon="info-square"
          title="This job is no longer available"
          description="It may have been closed or filled. Close this and pick another from your list."
        />
      ) : (
        <JobDetailContent detail={shown} showHomeowner={!isNew} />
      )}
    </DetailDialog>
  );
}
