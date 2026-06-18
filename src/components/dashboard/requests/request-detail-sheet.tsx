"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { HomeownerRequestDetail } from "@/lib/data/homeowner";
import { getRequestDetailAction } from "@/lib/actions/requests";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

export function RequestDetailSheet({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<HomeownerRequestDetail | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    if (!open || !leadId) return;
    startLoad(async () => {
      setDetail(await getRequestDetailAction(leadId));
    });
  }, [open, leadId]);

  const shown = detail && detail.leadId === leadId ? detail : null;
  const place = shown ? [shown.city, shown.state].filter(Boolean).join(", ") : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-md lg:data-[side=right]:sm:max-w-[34vw]">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="pr-8 lg:pr-[2.5vw] capitalize">
            {shown ? (shown.subtype ?? shown.serviceName) : "Request"}
          </SheetTitle>
          {shown ? (
            <span
              className={cn(
                "w-fit rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
                REQUEST_META[shown.requestStatus].pill,
              )}
            >
              {REQUEST_META[shown.requestStatus].label}
            </span>
          ) : null}
        </SheetHeader>

        <div className="flex-1 space-y-6 lg:space-y-[1.667vw] overflow-y-auto p-6 lg:p-[1.667vw]">
          {loading && !shown ? (
            <p className="text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
          ) : !shown ? (
            <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
              This request is no longer available.
            </p>
          ) : (
            <>
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
                  <p className="rounded-lg lg:rounded-[0.694vw] border border-dashed border-border p-4 lg:p-[1.111vw] text-sm lg:text-[0.903vw] text-muted-foreground">
                    No contractors have reached out yet. We’ll notify you the moment
                    one does.
                  </p>
                ) : (
                  <ul className="space-y-2.5 lg:space-y-[0.694vw]">
                    {shown.contractors.map((c) => (
                      <li
                        key={c.contractorId}
                        className="flex items-center justify-between gap-3 lg:gap-[0.833vw] rounded-lg lg:rounded-[0.694vw] border border-border bg-card p-3 lg:p-[0.833vw]"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 lg:gap-[0.417vw] truncate font-medium lg:text-[0.972vw]">
                            {c.contractorName ?? "Contractor"}
                            {c.hasUnread ? (
                              <span aria-label="Unread" className="size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary" />
                            ) : null}
                          </p>
                          <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.833vw] text-muted-foreground">
                            {c.quoteStatus
                              ? `${c.quoteStatus === "accepted" ? "Accepted" : "Quote"} · ${c.quoteTotal ? formatCurrency(c.quoteTotal) : "—"}`
                              : "In conversation"}
                          </p>
                        </div>
                        {c.conversationId ? (
                          <Link
                            href={`/homeowner/messages/${c.conversationId}`}
                            className="inline-flex shrink-0 items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] bg-foreground px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold text-background transition-colors hover:bg-foreground/90"
                          >
                            <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Chat
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
