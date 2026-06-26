"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import type { EstimateStatus } from "@/lib/data/projects";
import type { BoardStatus, JobCard as Job, LeadUrgency } from "@/lib/data/jobs";
import { formatDistanceToNow, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SlaCountdown } from "../leads/sla-countdown";
import { BOARD_ACCENT, BOARD_BADGE, BOARD_META, BOARD_TINT } from "./board-meta";

const QUOTE_LABEL: Record<EstimateStatus, string> = {
  draft: "Draft",
  sent: "Quote sent",
  accepted: "Accepted",
  rejected: "Declined",
};

// Plain-language timeline — what the homeowner said about how soon they want it.
const URGENCY: Record<LeadUrgency, { label: string; cls: string }> = {
  emergency: { label: "Wants it ASAP", cls: "text-destructive" },
  within_week: { label: "Wants it within a week", cls: "text-warning" },
  within_month: { label: "Wants it within a month", cls: "text-primary" },
  planning: { label: "Just planning ahead", cls: "text-muted-foreground" },
};

// Pipeline steps for the progress bar (lost sits outside the flow).
const STAGES: BoardStatus[] = ["new", "talking", "quoted", "won", "done"];

// Soft, deterministic avatar tints so a wall of cards feels alive (no photos).
const AVATAR_TINTS = [
  "bg-primary/10 text-primary",
  "bg-success-bg text-success",
  "bg-warning-bg text-warning",
  "bg-info/15 text-info",
  "bg-chart-4/15 text-chart-4",
];

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

export function JobsCardGrid({
  jobs,
  onView,
}: {
  jobs: Job[];
  onView: (leadId: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <JobCardItem key={job.leadId} job={job} onView={onView} />
      ))}
    </div>
  );
}

export function JobCardItem({
  job,
  onView,
  inColumn = false,
}: {
  job: Job;
  onView: (leadId: string) => void;
  /** Rendered inside a kanban column — hide the redundant status badge + stepper. */
  inColumn?: boolean;
}) {
  const isNew = job.boardStatus === "new";
  const place =
    [job.city, job.state].filter(Boolean).join(", ") ||
    job.zipCode ||
    "Location TBD";
  const urgency = URGENCY[job.urgency];
  const hasQuote = job.latestQuoteTotal != null && !isNew;
  const hasContact = job.homeownerEmail != null || job.homeownerPhone != null;
  const stageIdx = STAGES.indexOf(job.boardStatus);

  function open() {
    onView(job.leadId);
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
        "group relative flex cursor-pointer flex-col rounded-md lg:rounded-[0.7vw] border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        BOARD_TINT[job.boardStatus],
        inColumn ? "p-4 lg:p-[1.111vw]" : "p-5 lg:p-[1.389vw]"
      )}
    >
      {/* Status badge — straddles the top edge in the right corner (per reference). */}
      {!inColumn ? (
        <span
          className={cn(
            "absolute top-0 right-0 z-10 inline-flex shrink-0 items-center gap-1.5 lg:gap-[0.417vw] rounded-tr-md rounded-bl-md lg:rounded-tr-[0.7vw] lg:rounded-bl-[0.6vw] border border-r-0 border-t-0 px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium",
            BOARD_BADGE[job.boardStatus]
          )}
        >
          {isNew ? (
            <span className="relative flex size-1.5 lg:size-[0.417vw]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
              <span className="relative inline-flex size-1.5 lg:size-[0.417vw] rounded-full bg-sky-500" />
            </span>
          ) : null}
          {BOARD_META[job.boardStatus].label}
        </span>
      ) : null}

      {/* Header: homeowner */}
      <div className="flex min-w-0 items-center gap-2.5 lg:gap-[0.694vw]">
        <span
          className={cn(
            "flex size-9 lg:size-[2.5vw] shrink-0 items-center justify-center rounded-full text-xs lg:text-[0.833vw] font-semibold",
            job.homeownerName
              ? tintFor(job.homeownerName)
              : "bg-muted text-muted-foreground"
          )}
        >
          {initials(job.homeownerName)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
            <p className="truncate text-sm lg:text-[0.972vw] font-semibold leading-tight text-foreground">
              {job.homeownerName ?? "New homeowner"}
            </p>
            {job.hasUnread ? (
              <span
                aria-label="Unread"
                className="size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary"
              />
            ) : null}
          </div>
          <span className="mt-0.5 lg:mt-[0.139vw] block text-xs lg:text-[0.764vw] leading-tight text-muted-foreground">
            {isNew && job.slaDeadline ? (
              <SlaCountdown
                deadline={job.slaDeadline}
                compact
                className="text-xs lg:text-[0.764vw]"
              />
            ) : (
              formatDistanceToNow(new Date(job.engagedAt ?? job.offeredAt))
            )}
          </span>
        </div>
      </div>

      {/* Direct hire — the homeowner picked this company specifically. */}
      {job.isDirect ? (
        <span className="mt-3 lg:mt-[0.833vw] inline-flex w-fit items-center gap-1.5 lg:gap-[0.417vw] rounded-full bg-primary/10 px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-semibold text-primary">
          <Icon name="badge-check" className="size-3.5 lg:size-[0.95vw]" />
          Direct request
        </span>
      ) : null}

      {/* Title = the work */}
      <h3 className="mt-3 lg:mt-[0.833vw] line-clamp-2 text-base lg:text-[1.181vw] font-bold leading-snug tracking-tight text-foreground">
        {job.subtype ?? job.serviceName}
      </h3>

      {/* Details */}
      <div className="mt-2.5 lg:mt-[0.694vw] space-y-1.5 lg:space-y-[0.417vw] text-sm lg:text-[0.903vw]">
        <MetaRow icon="location">
          <span className="truncate text-foreground">{place}</span>
        </MetaRow>
        <MetaRow icon="time-circle" iconClass={urgency.cls}>
          <span className={cn("truncate font-medium", urgency.cls)}>
            {urgency.label}
          </span>
        </MetaRow>
        {hasQuote ? (
          <MetaRow icon="wallet">
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(job.latestQuoteTotal!)}
            </span>
            {job.latestQuoteStatus ? (
              <span
                className={cn(
                  "ml-1.5 lg:ml-[0.417vw]",
                  job.latestQuoteStatus === "accepted"
                    ? "text-success"
                    : "text-muted-foreground"
                )}
              >
                · {QUOTE_LABEL[job.latestQuoteStatus]}
              </span>
            ) : null}
          </MetaRow>
        ) : null}
      </div>

      {/* Homeowner photos — a quick visual of the actual job. */}
      {job.images.length > 0 ? (
        <div className="mt-3 lg:mt-[0.833vw] flex gap-2 lg:gap-[0.556vw]">
          {job.images.slice(0, 3).map((src, i) => (
            <div
              key={i}
              className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-md lg:rounded-[0.5vw] bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
              {i === 2 && job.images.length > 3 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-sm lg:text-[0.903vw] font-semibold text-background">
                  +{job.images.length - 3}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Pipeline progress (redundant inside a kanban column) */}
      {!inColumn ? (
        <div className="mt-4 lg:mt-[1.111vw] flex gap-1 lg:gap-[0.278vw]">
          {STAGES.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1.5 lg:h-[0.417vw] flex-1 rounded-full",
                stageIdx >= 0 && i <= stageIdx
                  ? BOARD_ACCENT[job.boardStatus]
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      ) : null}

      {/* Contact — unlocked once the homeowner accepts a quote */}
      {hasContact ? (
        <div className="mt-4 lg:mt-[1.111vw] space-y-2 lg:space-y-[0.556vw] border-t border-border pt-3 lg:pt-[0.833vw] text-sm lg:text-[0.903vw]">
          {job.homeownerPhone ? (
            <a
              href={`tel:${job.homeownerPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 lg:gap-[0.556vw] font-medium text-foreground hover:text-primary"
            >
              <Icon
                name="call"
                className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground"
              />
              <span className="truncate">{job.homeownerPhone}</span>
            </a>
          ) : null}
          {job.homeownerEmail ? (
            <a
              href={`mailto:${job.homeownerEmail}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 lg:gap-[0.556vw] text-muted-foreground hover:text-primary"
            >
              <Icon
                name="chat"
                className="size-4 lg:size-[1.111vw] shrink-0"
              />
              <span className="truncate">{job.homeownerEmail}</span>
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Spacer — absorbs extra height so the button sits at the bottom and rows line up. */}
      <div aria-hidden className="grow" />

      {/* Action — anchored to the bottom so cards in a row line up. New leads get a
          louder, filled button to nudge a fast response. */}
      <span
        className={cn(
          "mt-4 lg:mt-[1.111vw] flex w-full items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-lg lg:rounded-[0.556vw] border px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium transition-colors",
          isNew
            ? "border-primary bg-primary text-primary-foreground shadow-sm group-hover:bg-primary/90"
            : "border-border bg-card text-foreground group-hover:border-foreground/20 group-hover:bg-muted/60"
        )}
      >
        View details
        <Icon name="arrow-right" className="size-4 lg:size-[1.111vw]" />
      </span>
    </div>
  );
}

function MetaRow({
  icon,
  iconClass,
  children,
}: {
  icon: IconName;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 lg:gap-[0.556vw] text-muted-foreground">
      <Icon
        name={icon}
        className={cn(
          "size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground",
          iconClass
        )}
      />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}
