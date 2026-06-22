import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The professional, document-style rendering of a quote. Pure presentational —
 * no hooks, so it works in both server trees (the public accept page) and client
 * trees (the in-chat "View quote" dialog). Built only from data already on the
 * `estimates` row + the owning `contractors` company, so no schema changes.
 *
 * This is the on-screen blueprint a future branded PDF should mirror.
 */
export type QuoteDocumentData = {
  estimateId: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  company: {
    name: string | null;
    logoUrl: string | null;
    licenseNumber: string | null;
    insuranceProvider: string | null;
    yearsInBusiness: number | null;
    verified: boolean;
    avgRating: string | null;
    totalReviews: number;
  };
  /** What the quote is for — shown in the meta row when known. */
  serviceName?: string | null;
  subtype?: string | null;
  /** The homeowner the quote is prepared for, when the viewer isn't them. */
  clientName?: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  lineItems: Array<{ label: string; amount: string }>;
  subtotal: string | null;
  /** Tax as a decimal fraction string, e.g. "0.0850" → shown as "8.5%". */
  taxRate: string | null;
  taxAmount: string | null;
  total: string | null;
  scopeNotes: string | null;
  warranty: string | null;
};

/**
 * A stable, human-readable reference for a quote, derived from its id + issue
 * date — no dedicated column needed. e.g. `Q-2026-9F3A`.
 */
export function deriveQuoteNumber(estimateId: string, issuedAt: string | null): string {
  const year = (issuedAt ? new Date(issuedAt) : new Date()).getFullYear();
  const short = estimateId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `Q-${year}-${short}`;
}

function formatPercent(fraction: string | null): string | null {
  if (!fraction) return null;
  const pct = parseFloat(fraction) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return `${+pct.toFixed(2)}%`;
}

export function QuoteDocument({
  data,
  className,
}: {
  data: QuoteDocumentData;
  className?: string;
}) {
  const { company } = data;
  const quoteNumber = deriveQuoteNumber(data.estimateId, data.issuedAt);
  const taxPercent = formatPercent(data.taxRate);
  const accepted = data.status === "accepted";
  const superseded = data.status === "rejected";
  const serviceLabel = data.subtype ?? data.serviceName ?? null;
  const rating =
    company.avgRating && company.totalReviews > 0 ? +company.avgRating : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card text-foreground",
        className,
      )}
    >
      {/* Letterhead */}
      <header className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt=""
              className="size-12 shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon name="work" className="size-6" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight">
              {company.name ?? "Your contractor"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {company.verified ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Icon name="shield-done" className="size-3.5" />
                  Verified
                </span>
              ) : null}
              {rating !== null ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="star-filled" className="size-3.5 text-warning" />
                  {rating.toFixed(1)} ({company.totalReviews})
                </span>
              ) : null}
              {company.licenseNumber ? (
                <span>License #{company.licenseNumber}</span>
              ) : null}
              {company.insuranceProvider ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="shield-done" className="size-3.5" />
                  Insured
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
            Quote
          </p>
          <p className="text-sm font-semibold tabular-nums">{quoteNumber}</p>
          <span
            className={cn(
              "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
              accepted
                ? "bg-success-bg text-success"
                : superseded
                  ? "bg-muted text-muted-foreground line-through"
                  : "bg-warning-bg text-warning",
            )}
          >
            {accepted ? "Accepted" : superseded ? "Superseded" : "Awaiting decision"}
          </span>
        </div>
      </header>

      {/* Meta */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border p-5 sm:p-6 text-sm">
        {data.clientName ? (
          <MetaCell label="Prepared for" value={data.clientName} />
        ) : null}
        {serviceLabel ? <MetaCell label="Service" value={serviceLabel} /> : null}
        <MetaCell
          label="Issued"
          value={data.issuedAt ? formatDate(new Date(data.issuedAt)) : "—"}
        />
        <MetaCell
          label="Valid until"
          value={data.validUntil ? formatDate(new Date(data.validUntil)) : "—"}
        />
        {data.warranty ? (
          <div className="col-span-2 min-w-0">
            <dt className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
              Warranty
            </dt>
            <dd className="mt-0.5 flex items-start gap-1.5 font-medium">
              <Icon name="shield-done" className="mt-0.5 size-3.5 shrink-0 text-success" />
              <span className="min-w-0 break-words">{data.warranty}</span>
            </dd>
          </div>
        ) : null}
      </dl>

      {/* Line items */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-border pb-2 text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
          <span>Description</span>
          <span>Amount</span>
        </div>
        <ul className="divide-y divide-border">
          {data.lineItems.map((li, i) => (
            <li
              key={i}
              className="flex items-start justify-between gap-4 py-2.5 text-sm"
            >
              <span className="min-w-0 break-words">{li.label}</span>
              <span className="shrink-0 tabular-nums">{formatCurrency(li.amount)}</span>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <dl className="mt-4 ml-auto w-full max-w-[16rem] space-y-1.5 text-sm">
          {data.subtotal ? (
            <TotalRow label="Subtotal" value={formatCurrency(data.subtotal)} />
          ) : null}
          {data.taxAmount ? (
            <TotalRow
              label={`Tax${taxPercent ? ` (${taxPercent})` : ""}`}
              value={formatCurrency(data.taxAmount)}
            />
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {data.total ? formatCurrency(data.total) : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Scope */}
      {data.scopeNotes ? (
        <section className="border-t border-border p-5 sm:p-6">
          <p className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
            Scope of work
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
            {data.scopeNotes}
          </p>
        </section>
      ) : null}

      {/* Footer / trust line */}
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-5 py-3 sm:px-6 text-xs text-muted-foreground">
        {company.yearsInBusiness ? (
          <span>{company.yearsInBusiness} years in business</span>
        ) : null}
        <span className="ml-auto">
          Quote {quoteNumber}
          {company.name ? ` · ${company.name}` : ""}
        </span>
      </footer>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
