"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { JobDetail } from "@/lib/data/jobs";
import { getJobDetailAction } from "@/lib/actions/jobs";
import { engageLead } from "@/lib/actions/engage";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { DeclineLeadDialog } from "../leads/decline-lead-dialog";
import { JobDetailContent } from "./job-detail-content";
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
  const router = useRouter();
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, startLoad] = useTransition();
  const [engaging, startEngage] = useTransition();

  useEffect(() => {
    if (!open || !leadId) return;
    startLoad(async () => {
      setDetail(await getJobDetailAction(leadId));
    });
  }, [open, leadId]);

  // Only show data that matches the currently-open lead (avoids a stale flash
  // when switching cards without clearing state inside the effect).
  const shown = detail && detail.leadId === leadId ? detail : null;

  function startChat() {
    if (!leadId || engaging) return;
    startEngage(async () => {
      const res = await engageLead(leadId);
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

  const isNew = shown?.boardStatus === "new";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-md lg:data-[side=right]:sm:max-w-[34vw]">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="pr-8 lg:pr-[2.5vw]">
            {shown?.homeowner.name ?? "Job details"}
          </SheetTitle>
          {shown ? (
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
          ) : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 lg:p-[1.667vw]">
          {loading && !shown ? (
            <p className="text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
          ) : !shown ? (
            <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
              This job is no longer available.
            </p>
          ) : (
            <JobDetailContent detail={shown} />
          )}
        </div>

        {shown ? (
          <SheetFooter className="border-t border-border">
            {isNew ? (
              <div className="flex items-center gap-2 lg:gap-[0.556vw]">
                <button
                  type="button"
                  onClick={startChat}
                  disabled={engaging}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] bg-foreground px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] text-sm lg:text-[0.903vw] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
                  {engaging
                    ? "Starting…"
                    : `Chat with homeowner · ${shown.engagementCreditCost} credit${shown.engagementCreditCost === 1 ? "" : "s"}`}
                </button>
                <DeclineLeadDialog leadId={shown.leadId} />
              </div>
            ) : shown.conversationId ? (
              <Link
                href={`/contractor/messages/${shown.conversationId}`}
                className="inline-flex items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] bg-foreground px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] text-sm lg:text-[0.903vw] font-semibold text-background transition-colors hover:bg-foreground/90"
              >
                <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Open chat
              </Link>
            ) : null}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
