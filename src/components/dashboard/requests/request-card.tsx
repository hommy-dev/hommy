"use client";

import { cn } from "@/lib/utils";
import { REQUEST_META, type RequestCardItem } from "./request-meta";

export function RequestCard({
  item,
  onView,
}: {
  item: RequestCardItem;
  onView: (leadId: string) => void;
}) {
  const meta = REQUEST_META[item.requestStatus];
  const location = [item.city, item.state].filter(Boolean).join(", ") || item.zipCode || "Location set";

  return (
    <article className="rounded-lg lg:rounded-[0.694vw] border border-border bg-card p-4 lg:p-[1.111vw] transition-colors hover:border-foreground/25">
      <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
        <span
          className={cn(
            "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
            meta.pill,
          )}
        >
          {meta.label}
        </span>
        {item.quoteCount > 0 ? (
          <span className="text-xs lg:text-[0.833vw] font-medium text-muted-foreground">
            {item.quoteCount} quote{item.quoteCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <p className="mt-3 lg:mt-[0.833vw] truncate font-semibold capitalize lg:text-[1.042vw]">
        {item.subtype ?? item.serviceName}
      </p>
      <p className="mt-0.5 lg:mt-[0.139vw] truncate text-sm lg:text-[0.903vw] text-muted-foreground">
        {location}
      </p>

      <p className="mt-2.5 lg:mt-[0.694vw] line-clamp-2 text-sm lg:text-[0.903vw] text-foreground/70">
        {item.summary}
      </p>

      <button
        type="button"
        onClick={() => onView(item.id)}
        className="mt-3 lg:mt-[0.833vw] w-full rounded-md lg:rounded-[0.417vw] border border-border px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw] font-medium transition-colors hover:bg-muted"
      >
        View details
      </button>
    </article>
  );
}
