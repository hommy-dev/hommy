import type { EstimateSummary, EstimateStatus } from "@/lib/data/projects";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS: Record<EstimateStatus, { label: string; pill: string }> = {
  draft: { label: "Draft", pill: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", pill: "bg-info/15 text-info" },
  accepted: { label: "Accepted", pill: "bg-success text-success-foreground" },
  rejected: { label: "Declined", pill: "bg-muted text-muted-foreground" },
};

/** Quotes on a project, newest first. Read-only summary cards. */
export function EstimateList({ estimates }: { estimates: EstimateSummary[] }) {
  if (estimates.length === 0) {
    return (
      <p className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-6 lg:p-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">
        No quotes yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3 lg:space-y-[0.833vw]">
      {estimates.map((e) => {
        const st = STATUS[e.status];
        return (
          <li key={e.id} className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-4 lg:p-[1.111vw]">
            <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
              <span
                className={cn(
                  "inline-flex items-center rounded-md lg:rounded-[0.417vw] px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
                  st.pill,
                )}
              >
                {st.label}
              </span>
              <span className="text-base lg:text-[1.111vw] font-semibold tabular-nums">
                {formatCurrency(e.total ?? "0")}
              </span>
            </div>

            <ul className="mt-3 lg:mt-[0.833vw] space-y-1 lg:space-y-[0.278vw] text-sm lg:text-[0.903vw]">
              {e.lineItems.map((li, i) => (
                <li key={i} className="flex items-center justify-between gap-3 lg:gap-[0.833vw] text-muted-foreground">
                  <span className="truncate">{li.label}</span>
                  <span className="tabular-nums">{formatCurrency(li.amount)}</span>
                </li>
              ))}
            </ul>

            {e.scopeNotes ? (
              <p className="mt-3 lg:mt-[0.833vw] whitespace-pre-wrap text-sm lg:text-[0.903vw] text-foreground/80">
                {e.scopeNotes}
              </p>
            ) : null}

            <p className="mt-3 lg:mt-[0.833vw] text-xs lg:text-[0.764vw] text-muted-foreground">
              {e.status === "sent" || e.status === "accepted"
                ? `Sent ${formatDate(e.sentAt)} · valid until ${formatDate(e.validUntil)}`
                : `Draft · valid for ${formatDate(e.validUntil)}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
