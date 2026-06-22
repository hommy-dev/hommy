import type { ReviewsSummary } from "@/lib/data/reviews";
import { cn } from "@/lib/utils";
import { Stars } from "@/components/reviews/stars";

/** Average + total + per-star distribution bars. Pass `flat` to drop the card
 *  chrome when it already sits inside a bordered section. When `hommyCount`/
 *  `googleCount` are given (combined view), an honest source breakdown is shown. */
export function ReviewsSummaryCard({
  summary,
  flat,
  hommyCount,
  googleCount,
}: {
  summary: ReviewsSummary;
  flat?: boolean;
  hommyCount?: number;
  googleCount?: number;
}) {
  const { avgRating, total, distribution } = summary;
  const showBreakdown =
    typeof hommyCount === "number" &&
    typeof googleCount === "number" &&
    googleCount > 0;

  return (
    <div
      className={cn(
        "grid gap-6 lg:gap-[1.667vw] sm:grid-cols-[auto_1fr] sm:items-center",
        flat ? "" : "rounded-md lg:rounded-[0.556vw] border border-border bg-card p-6 lg:p-[1.667vw]"
      )}
    >
      <div className="text-center">
        <p className="text-4xl lg:text-[2.778vw] font-semibold tabular-nums leading-none">
          {avgRating !== null ? avgRating.toFixed(1) : "—"}
        </p>
        <div className="mt-2 lg:mt-[0.556vw] flex justify-center">
          <Stars rating={avgRating ?? 0} starClassName="lg:size-[1.111vw]" />
        </div>
        <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.764vw] text-muted-foreground">
          {total} review{total === 1 ? "" : "s"}
        </p>
        {showBreakdown ? (
          <p className="mt-0.5 lg:mt-[0.139vw] text-[11px] lg:text-[0.694vw] text-muted-foreground">
            {hommyCount} on Hommy · {googleCount} from Google
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5 lg:space-y-[0.417vw]">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 lg:gap-[0.556vw] text-xs lg:text-[0.764vw]">
              <span className="w-3 lg:w-[0.833vw] tabular-nums text-muted-foreground">{star}</span>
              <div className="h-2 lg:h-[0.556vw] flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 lg:w-[2vw] text-right tabular-nums text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
