"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { declineLead } from "@/lib/actions/decline-lead";

/** Decline a lead offer with an optional reason (a reason softens the score hit). */
export function DeclineLeadDialog({
  leadId,
  triggerClassName,
}: {
  leadId: string;
  /** Override the trigger styling. Defaults to the lead-card's hover-reveal button. */
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function confirm() {
    if (pending) return;
    start(async () => {
      const res = await declineLead(leadId, reason);
      if (res.ok) {
        showToast("Lead declined.", { type: "success" });
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "hidden rounded-md lg:rounded-[0.417vw] border border-border bg-card px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-hover:inline-flex"
          }
        >
          Decline
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md lg:max-w-[28vw]">
        <DialogHeader>
          <DialogTitle>Decline this lead?</DialogTitle>
          <DialogDescription>
            It’ll be offered to another contractor. A short reason softens the
            impact on your profile score.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason (optional) — e.g. outside our area, too busy…"
          className="w-full resize-none rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
        />
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md lg:rounded-[0.556vw] border border-border bg-card px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="rounded-md lg:rounded-[0.556vw] bg-foreground px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Declining…" : "Decline lead"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
