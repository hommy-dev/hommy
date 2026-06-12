import type { ContractorReview } from "@/lib/data/reviews";
import { formatDate } from "@/lib/format";
import { Stars } from "@/components/reviews/stars";

/** Submitted reviews, newest first. */
export function ReviewList({ reviews }: { reviews: ContractorReview[] }) {
  return (
    <ul className="space-y-3 lg:space-y-[0.833vw]">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-4 lg:p-[1.111vw]">
          <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
            <div className="flex items-center gap-2 lg:gap-[0.556vw]">
              <Stars rating={r.rating} starClassName="lg:size-[1.111vw]" />
              <span className="text-sm lg:text-[0.903vw] font-medium">{r.reviewerName ?? "Homeowner"}</span>
            </div>
            <span className="text-xs lg:text-[0.764vw] text-muted-foreground">{formatDate(r.submittedAt)}</span>
          </div>
          {r.comment ? (
            <p className="mt-2 lg:mt-[0.556vw] whitespace-pre-wrap text-sm lg:text-[0.903vw] text-foreground/80">
              {r.comment}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
