import { Icon } from "@/components/ui/icon";
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
        <Icon
          key={n}
          name={n <= filled ? "star-filled" : "star"}
          className={cn(
            "size-4",
            n <= filled ? "text-warning" : "text-muted-foreground/40",
            starClassName,
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}
