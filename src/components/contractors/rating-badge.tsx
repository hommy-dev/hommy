import { Stars } from "@/components/reviews/stars";
import { cn } from "@/lib/utils";

/** A plain-language label for a rating — visual/descriptive, not a bare number. */
export function ratingLabel(avgRating: number | null, totalReviews: number): string {
  if (!totalReviews || avgRating === null) return "New to Homei";
  if (avgRating >= 4.5) return "Excellent";
  if (avgRating >= 4.0) return "Highly rated";
  if (avgRating >= 3.5) return "Well rated";
  if (avgRating >= 3.0) return "Mixed reviews";
  return "Lower rated";
}

/** "Usually responds in ~2h" from avg response minutes (or null → nothing). */
export function responseLabel(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 90) return "Usually responds within an hour";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Usually responds in ~${hours}h`;
  const days = Math.round(hours / 24);
  return `Usually responds in ~${days}d`;
}

/**
 * Compact, decision-friendly rating: stars + a descriptive word + review count.
 * For an unrated company it reads "New to Homei" instead of an empty 0★.
 */
export function RatingBadge({
  avgRating,
  totalReviews,
  className,
}: {
  avgRating: number | null;
  totalReviews: number;
  className?: string;
}) {
  const rated = totalReviews > 0 && avgRating !== null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 lg:gap-[0.417vw]", className)}>
      {rated ? <Stars rating={avgRating} className="gap-0" /> : null}
      <span className="text-xs lg:text-[0.833vw] font-medium text-foreground">
        {ratingLabel(avgRating, totalReviews)}
      </span>
      {rated ? (
        <span className="text-xs lg:text-[0.833vw] text-muted-foreground">
          {avgRating.toFixed(1)} · {totalReviews} review{totalReviews === 1 ? "" : "s"}
        </span>
      ) : null}
    </span>
  );
}
