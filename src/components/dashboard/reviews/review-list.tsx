import type { ContractorReview } from "@/lib/data/reviews";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Stars } from "@/components/reviews/stars";

// Soft, deterministic avatar tints (no stored photos for reviewers).
const TINTS = [
  "bg-primary/10 text-primary",
  "bg-success-bg text-success",
  "bg-warning-bg text-warning",
  "bg-info/15 text-info",
  "bg-chart-4/15 text-chart-4",
];

function initials(name: string | null): string {
  if (!name) return "?";
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function tintFor(name: string | null): string {
  if (!name) return "bg-muted text-muted-foreground";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Submitted reviews, newest first — one rich row each. */
export function ReviewList({
  reviews,
  className,
}: {
  reviews: ContractorReview[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3 lg:space-y-[0.833vw]", className)}>
      {reviews.map((r) => {
        const isGoogle = r.source === "google";
        const who = r.reviewerName ?? (isGoogle ? "Google reviewer" : "Homeowner");
        return (
          <li
            key={r.id}
            className="flex gap-4 lg:gap-[1.111vw] rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-5 lg:p-[1.389vw]"
          >
            {isGoogle && r.authorPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, not re-hosted
              <img
                src={r.authorPhotoUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-11 lg:size-[3vw] shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className={cn(
                  "flex size-11 lg:size-[3vw] shrink-0 items-center justify-center rounded-full text-sm lg:text-[0.972vw] font-semibold",
                  tintFor(r.reviewerName)
                )}
              >
                {initials(r.reviewerName)}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3 lg:gap-[0.833vw]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-semibold text-foreground">
                    <span className="truncate">{who}</span>
                    {!isGoogle ? (
                      <Icon
                        name="badge-check"
                        className="size-3.5 lg:size-[0.972vw] shrink-0 text-primary"
                      />
                    ) : null}
                  </div>
                  <div className="mt-1 lg:mt-[0.278vw] flex items-center gap-2 lg:gap-[0.556vw]">
                    <Stars rating={r.rating} starClassName="lg:size-[1.042vw]" />
                    {isGoogle ? (
                      r.sourceUrl ? (
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-xs lg:text-[0.833vw] text-muted-foreground hover:text-foreground hover:underline"
                        >
                          via Google
                        </a>
                      ) : (
                        <span className="text-xs lg:text-[0.833vw] text-muted-foreground">via Google</span>
                      )
                    ) : (
                      <span className="text-xs lg:text-[0.833vw] text-muted-foreground">Verified customer</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs lg:text-[0.833vw] text-muted-foreground">
                  {formatDate(r.submittedAt)}
                </span>
              </div>

              {r.comment ? (
                <p className="mt-3 lg:mt-[0.833vw] whitespace-pre-wrap text-sm lg:text-[0.972vw] leading-relaxed text-foreground/80">
                  {r.comment}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
