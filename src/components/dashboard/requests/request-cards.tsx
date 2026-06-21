"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import { formatCurrency, formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  REQUEST_ACCENT,
  REQUEST_BADGE,
  REQUEST_META,
  REQUEST_TINT,
  type RequestCardItem,
} from "./request-meta";

export function RequestsCardGrid({
  items,
  onView,
}: {
  items: RequestCardItem[];
  onView: (leadId: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <RequestCard key={item.id} item={item} onView={onView} />
      ))}
    </div>
  );
}

export function RequestCard({
  item,
  onView,
}: {
  item: RequestCardItem;
  onView: (leadId: string) => void;
}) {
  const place =
    [item.city, item.state].filter(Boolean).join(", ") ||
    item.zipCode ||
    "Location TBD";
  // "Quotes in" is the one state where the homeowner needs to act, so it gets the
  // loud treatment (pulsing badge + filled button) the way new leads do for pros.
  const needsAction = item.requestStatus === "quotes";
  // A finished job still owing a review gets its own filled call-to-action.
  const highlight = needsAction || item.canReview;
  const actionLabel = item.canReview
    ? "Leave a review"
    : needsAction
      ? "Review quotes"
      : "View details";
  const actionIcon: IconName = item.canReview ? "star" : "arrow-right";

  function open() {
    onView(item.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col rounded-md lg:rounded-[0.7vw] border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring p-5 lg:p-[1.389vw]",
        REQUEST_TINT[item.requestStatus]
      )}
    >
      {/* Status badge — straddles the top edge in the right corner. */}
      <span
        className={cn(
          "absolute top-0 right-0 z-10 inline-flex shrink-0 items-center gap-1.5 lg:gap-[0.417vw] rounded-tr-md rounded-bl-md lg:rounded-tr-[0.7vw] lg:rounded-bl-[0.6vw] border border-r-0 border-t-0 px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium",
          REQUEST_BADGE[item.requestStatus]
        )}
      >
        {needsAction ? (
          <span className="relative flex size-1.5 lg:size-[0.417vw]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
            <span className="relative inline-flex size-1.5 lg:size-[0.417vw] rounded-full bg-violet-500" />
          </span>
        ) : null}
        {REQUEST_META[item.requestStatus].label}
      </span>

      {/* Top: a small home chip + when it was posted */}
      <div className="flex items-center gap-2.5 lg:gap-[0.694vw]">
        <span className="flex size-9 lg:size-[2.5vw] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="home" className="size-4 lg:size-[1.25vw]" />
        </span>
        <span className="text-xs lg:text-[0.764vw] text-muted-foreground">
          Posted {formatDistanceToNow(new Date(item.createdAt))}
        </span>
      </div>

      {/* Title = the work */}
      <h3 className="mt-3 lg:mt-[0.833vw] line-clamp-2 text-base lg:text-[1.181vw] font-bold capitalize leading-snug tracking-tight text-foreground">
        {item.subtype ?? item.serviceName}
      </h3>

      {/* What's happening now — the homeowner's single most useful line */}
      <div className="mt-2.5 lg:mt-[0.694vw] flex items-start gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.5vw] border border-border/60 bg-card/70 px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw]">
        <span
          className={cn(
            "mt-1 lg:mt-[0.278vw] size-2 lg:size-[0.556vw] shrink-0 rounded-full",
            REQUEST_ACCENT[item.requestStatus]
          )}
        />
        <span className="text-sm lg:text-[0.903vw] font-medium leading-snug text-foreground">
          {item.summary}
        </span>
      </div>

      {/* Details */}
      <div className="mt-3 lg:mt-[0.833vw] space-y-1.5 lg:space-y-[0.417vw] text-sm lg:text-[0.903vw]">
        <MetaRow icon="location">
          <span className="truncate text-foreground">{place}</span>
        </MetaRow>
        {item.quoteCount > 0 ? (
          <MetaRow icon="wallet">
            <span className="font-semibold tabular-nums text-foreground">
              {item.bestQuoteTotal
                ? `from ${formatCurrency(item.bestQuoteTotal)}`
                : `${item.quoteCount} quote${item.quoteCount === 1 ? "" : "s"}`}
            </span>
            {item.bestQuoteTotal ? (
              <span className="ml-1.5 lg:ml-[0.417vw] text-muted-foreground">
                · {item.quoteCount} quote{item.quoteCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </MetaRow>
        ) : null}
      </div>

      {/* Photos the homeowner attached */}
      {item.images.length > 0 ? (
        <div className="mt-3 lg:mt-[0.833vw] flex gap-2 lg:gap-[0.556vw]">
          {item.images.slice(0, 3).map((src, i) => (
            <div
              key={i}
              className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-md lg:rounded-[0.5vw] bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              {i === 2 && item.images.length > 3 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-sm lg:text-[0.903vw] font-semibold text-background">
                  +{item.images.length - 3}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Spacer — keeps the button at the bottom so cards in a row line up. */}
      <div aria-hidden className="grow" />

      {/* Action — louder when there are quotes to review, or a review to leave. */}
      <span
        className={cn(
          "mt-4 lg:mt-[1.111vw] flex w-full items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-lg lg:rounded-[0.556vw] border px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium transition-colors",
          highlight
            ? "border-primary bg-primary text-primary-foreground shadow-sm group-hover:bg-primary/90"
            : "border-border bg-card text-foreground group-hover:border-foreground/20 group-hover:bg-muted/60"
        )}
      >
        {actionLabel}
        <Icon name={actionIcon} className="size-4 lg:size-[1.111vw]" />
      </span>
    </div>
  );
}

function MetaRow({
  icon,
  children,
}: {
  icon: IconName;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 lg:gap-[0.556vw] text-muted-foreground">
      <Icon name={icon} className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}
