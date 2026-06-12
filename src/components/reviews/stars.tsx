import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star rating (rounded to nearest whole for fill). */
export function Stars({
  rating,
  className,
  starClassName,
}: {
  rating: number;
  className?: string;
  starClassName?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            n <= filled ? "fill-warning text-warning" : "fill-none text-muted-foreground/40",
            starClassName,
          )}
          strokeWidth={1.5}
          aria-hidden
        />
      ))}
    </span>
  );
}
