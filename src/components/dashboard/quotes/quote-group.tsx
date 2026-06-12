import type { HomeownerQuoteGroup } from "@/lib/data/homeowner";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AcceptQuoteDialog } from "./accept-quote-dialog";

/** One request and the quotes received for it — compare side by side, accept one. */
export function QuoteGroup({ group }: { group: HomeownerQuoteGroup }) {
  const place = [group.city, group.state].filter(Boolean).join(", ");
  const awarded = group.leadStatus === "awarded";

  return (
    <section className="rounded-md lg:rounded-[0.556vw] border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 lg:gap-[0.556vw] border-b border-border px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
        <div>
          <h2 className="text-sm lg:text-[0.972vw] font-semibold">{group.subtype ?? group.serviceName}</h2>
          {place ? <p className="text-xs lg:text-[0.764vw] text-muted-foreground">{place}</p> : null}
        </div>
        <span className="text-xs lg:text-[0.764vw] text-muted-foreground">
          {group.quotes.length} quote{group.quotes.length === 1 ? "" : "s"}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {group.quotes.map((q) => {
          const isAccepted = q.status === "accepted";
          return (
            <li key={q.estimateId} className="p-4 lg:p-[1.111vw]">
              <div className="flex flex-wrap items-start justify-between gap-3 lg:gap-[0.833vw]">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{q.contractorName ?? "Contractor"}</p>
                  <p className="text-2xl lg:text-[1.667vw] font-semibold tabular-nums">
                    {formatCurrency(q.total ?? "0")}
                  </p>
                </div>
                <div className="shrink-0">
                  {isAccepted ? (
                    <span className="inline-flex items-center rounded-md lg:rounded-[0.417vw] bg-success px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-semibold text-success-foreground">
                      Hired
                    </span>
                  ) : awarded ? (
                    <span className="inline-flex items-center rounded-md lg:rounded-[0.417vw] bg-muted px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-medium text-muted-foreground">
                      Not selected
                    </span>
                  ) : (
                    <AcceptQuoteDialog
                      estimateId={q.estimateId}
                      contractorName={q.contractorName ?? "this contractor"}
                      total={q.total}
                    />
                  )}
                </div>
              </div>

              <ul className={cn("mt-3 lg:mt-[0.833vw] space-y-1 lg:space-y-[0.278vw] text-sm lg:text-[0.903vw]", awarded && !isAccepted && "opacity-60")}>
                {q.lineItems.map((li, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 lg:gap-[0.833vw] text-muted-foreground">
                    <span className="truncate">{li.label}</span>
                    <span className="tabular-nums">{formatCurrency(li.amount)}</span>
                  </li>
                ))}
              </ul>

              {q.scopeNotes ? (
                <p className="mt-3 lg:mt-[0.833vw] whitespace-pre-wrap text-sm lg:text-[0.903vw] text-foreground/80">
                  {q.scopeNotes}
                </p>
              ) : null}

              {!awarded ? (
                <p className="mt-2 lg:mt-[0.556vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                  Valid until {formatDate(q.validUntil)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
