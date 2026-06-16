"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import type { MessageMeta } from "@/lib/db/schema";
import { acceptEstimate } from "@/lib/actions/accept-estimate";
import { showToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A quote rendered inline in the thread. The homeowner can accept it here; the
 * contractor sees a read-only card. Acceptance is re-checked server-side.
 */
export function QuoteCard({
  meta,
  canAccept,
}: {
  meta: Extract<MessageMeta, { kind: "quote" }>;
  canAccept: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const accepted = meta.status === "accepted";

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

  return (
    <div className="flex justify-center py-1.5 lg:py-[0.417vw]">
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
                accepted ? "text-success" : "text-muted-foreground",
              )}
            >
              {accepted ? "Accepted" : "Awaiting your decision"}
            </p>
          </div>
          <span className="ml-auto text-base lg:text-[1.111vw] font-semibold tabular-nums">
            {meta.total ? formatCurrency(meta.total) : "—"}
          </span>
        </div>

        {canAccept && !accepted ? (
          <button
            type="button"
            onClick={accept}
            disabled={pending}
            className="mt-3 lg:mt-[0.833vw] w-full rounded-md lg:rounded-[0.417vw] bg-foreground px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
          >
            {pending ? "Accepting…" : "Accept quote"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
