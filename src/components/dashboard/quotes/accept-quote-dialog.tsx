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
import { formatCurrency } from "@/lib/format";
import { acceptEstimate } from "@/lib/actions/accept-estimate";

/** Homeowner confirms hiring one contractor — accepting declines the rest. */
export function AcceptQuoteDialog({
  estimateId,
  contractorName,
  total,
}: {
  estimateId: string;
  contractorName: string;
  total: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    if (pending) return;
    start(async () => {
      const res = await acceptEstimate(estimateId);
      if (res.ok) {
        showToast(`You hired ${contractorName}.`, { type: "success" });
        setOpen(false);
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
          className="rounded-md lg:rounded-[0.556vw] bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Accept quote
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md lg:max-w-[28vw]">
        <DialogHeader>
          <DialogTitle>Hire {contractorName}?</DialogTitle>
          <DialogDescription>
            Accepting this {total ? formatCurrency(total) : ""} quote hires{" "}
            {contractorName} and declines the other quotes on this request. This
            can’t be undone.
          </DialogDescription>
        </DialogHeader>
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
            className="rounded-md lg:rounded-[0.556vw] bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Hiring…" : "Confirm & hire"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
