"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { engageLead } from "@/lib/actions/engage";
import { showToast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Engaging spends credits, so we confirm + disclose BEFORE charging — what it
 * costs, that it unlocks the homeowner's contact, and that the full charge only
 * lands on quote acceptance. Wraps both the Jobs-table row button and the detail
 * Sheet footer button so the engage logic lives in one place.
 */
export function EngageConfirm({
  leadId,
  engagementCreditCost,
  homeownerName,
  triggerClassName,
  triggerContent,
  disabled = false,
  stopPropagation = false,
}: {
  leadId: string;
  engagementCreditCost: number;
  homeownerName?: string | null;
  triggerClassName?: string;
  triggerContent: React.ReactNode;
  /** True on the table row so opening the dialog doesn't also open the row sheet. */
  stopPropagation?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const credits = `${engagementCreditCost} credit${engagementCreditCost === 1 ? "" : "s"}`;

  function confirm() {
    if (pending) return;
    start(async () => {
      const res = await engageLead(leadId);
      if (res.ok) {
        showToast(
          `Chat unlocked · ${res.creditsSpent} credit${res.creditsSpent === 1 ? "" : "s"} spent · ${res.balanceAfter} left`,
          { type: "success" },
        );
        router.push(`/contractor/messages/${res.conversationId}`);
        return;
      }
      setOpen(false);
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
          className={triggerClassName}
        >
          {triggerContent}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Start the chat?</AlertDialogTitle>
          <AlertDialogDescription>
            This spends {credits} and unlocks{" "}
            {homeownerName ? `${homeownerName}'s` : "the homeowner's"} contact details. You’ll be
            charged the full amount only if they accept your quote.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex h-9 lg:h-[2.5vw] items-center justify-center rounded-md lg:rounded-[0.556vw] bg-primary px-4 lg:px-[1.111vw] text-sm lg:text-[0.903vw] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Engaging…" : `Engage · ${engagementCreditCost} cr`}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
