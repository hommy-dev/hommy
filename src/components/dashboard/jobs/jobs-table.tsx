"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardStatus, JobCard as Job } from "@/lib/data/jobs";
import { formatDistanceToNow, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SlaCountdown } from "../leads/sla-countdown";
import { JobDetailSheet } from "./job-detail-sheet";
import { JobsCardGrid } from "./job-cards";
import { JobKanban } from "./job-kanban";
import { BOARD_ACCENT, BOARD_META } from "./board-meta";

type ViewMode = "table" | "cards" | "kanban";

type Tab = BoardStatus | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "talking", label: "Talking" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "lost", label: "Closed" },
];

// Copy for the *filtered* empty view (there are jobs, just none in this tab or
// matching this search). Spoken plainly, like you'd tell a coworker what's up.
const TAB_EMPTY: Record<Tab, { title: string; description: string }> = {
  all: {
    title: "No active jobs right now",
    description: "Jobs you're working on show up here once you engage a lead.",
  },
  new: {
    title: "No new leads right now",
    description:
      "Fresh leads in your area land here. We'll ping you the moment one comes in.",
  },
  talking: {
    title: "No chats going yet",
    description:
      "Once you start chatting with a homeowner, the job moves here.",
  },
  quoted: {
    title: "Nothing quoted yet",
    description:
      "Jobs where you've sent a quote wait here until the homeowner decides.",
  },
  won: {
    title: "Nothing in progress",
    description: "When a homeowner hires you, the job shows up here while you work it.",
  },
  done: {
    title: "Nothing wrapped up yet",
    description:
      "Finished jobs get collected here so you can look back on them.",
  },
  lost: {
    title: "Nothing closed",
    description: "Jobs that didn't pan out end up here.",
  },
};

export function JobsTable({ jobs }: { jobs: Job[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("cards");

  // Remember the chosen layout across visits.
  useEffect(() => {
    const v = localStorage.getItem("jobs-view");
    if (v === "table" || v === "cards" || v === "kanban") setView(v);
  }, []);
  function changeView(next: ViewMode) {
    setView(next);
    try {
      localStorage.setItem("jobs-view", next);
    } catch {
      /* private mode / storage off — keep the in-memory choice */
    }
  }

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: 0,
      new: 0,
      talking: 0,
      quoted: 0,
      won: 0,
      done: 0,
      lost: 0,
    };
    for (const j of jobs) {
      c[j.boardStatus] += 1;
      if (j.boardStatus !== "lost") c.all += 1;
    }
    return c;
  }, [jobs]);

  // Search applies to every view; the tab filter only to table/cards (kanban
  // shows all columns at once).
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.homeownerName, j.serviceName, j.subtype, j.city, j.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [jobs, query]);

  const filtered = useMemo(
    () => searched.filter((j) => (tab === "all" ? j.boardStatus !== "lost" : j.boardStatus === tab)),
    [searched, tab],
  );

  function renderEmpty(tabAware: boolean) {
    if (query.trim()) {
      return (
        <EmptyState
          size="sm"
          icon="search"
          title="No jobs match your search"
          description={`Nothing here matches "${query.trim()}". Try a different word, or clear the search.`}
        />
      );
    }
    return (
      <EmptyState
        size="sm"
        icon="paper"
        {...(tabAware
          ? TAB_EMPTY[tab]
          : { title: "No jobs yet", description: "Leads you're offered show up here as they come in." })}
      />
    );
  }

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {/* Search + status filter on the left, layout toggle on the right */}
      <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-[0.556vw]">
          <div className="relative min-w-0 flex-1 sm:max-w-xs lg:max-w-[20vw]">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
              className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-9 lg:pl-[2.5vw] pr-3 lg:pr-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
            />
          </div>

          {/* A board already shows every column, so the filter is redundant there on desktop. */}
          <div className={cn("shrink-0", view === "kanban" && "lg:hidden")}>
            <StatusFilter tab={tab} counts={counts} onChange={setTab} />
          </div>
        </div>

        <div className="inline-flex shrink-0 rounded-lg lg:rounded-[0.556vw] border border-border bg-card p-0.5 lg:p-[0.139vw]">
          <ViewToggle active={view === "cards"} label="Card view" onClick={() => changeView("cards")}>
            <GridIcon />
          </ViewToggle>
          <ViewToggle active={view === "table"} label="Table view" onClick={() => changeView("table")}>
            <RowsIcon />
          </ViewToggle>
          <ViewToggle active={view === "kanban"} label="Board view" onClick={() => changeView("kanban")}>
            <ColumnsIcon />
          </ViewToggle>
        </div>
      </div>

      {view === "kanban" ? (
        <>
          {/* Desktop board */}
          <div className="hidden lg:block">
            {searched.length === 0 ? (
              renderEmpty(false)
            ) : (
              <JobKanban jobs={searched} onView={setOpenLeadId} />
            )}
          </div>
          {/* Mobile: a board doesn't fit, so fall back to the tab-filtered cards */}
          <div className="lg:hidden">
            {filtered.length === 0 ? renderEmpty(true) : <JobsCardGrid jobs={filtered} onView={setOpenLeadId} />}
          </div>
        </>
      ) : filtered.length === 0 ? (
        renderEmpty(true)
      ) : view === "cards" ? (
        <JobsCardGrid jobs={filtered} onView={setOpenLeadId} />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Homeowner</Th>
                <Th>Work</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th>Quote</Th>
                <Th>Updated</Th>
                <th className="px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] pr-4 lg:pr-[1.111vw] text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((j) => (
                <JobRow key={j.leadId} job={j} onView={setOpenLeadId} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <JobDetailSheet
        leadId={openLeadId}
        open={openLeadId !== null}
        onOpenChange={(o) => !o && setOpenLeadId(null)}
      />
    </div>
  );
}

function StatusFilter({
  tab,
  counts,
  onChange,
}: {
  tab: Tab;
  counts: Record<Tab, number>;
  onChange: (t: Tab) => void;
}) {
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Filter by status"
          className="inline-flex h-9 lg:h-[2.5vw] items-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.903vw] font-medium outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring data-[state=open]:bg-muted/60"
        >
          <Icon name="filter" className="size-4 lg:size-[1.111vw] text-muted-foreground" />
          <span className="whitespace-nowrap">{active.label}</span>
          <span className="hidden tabular-nums text-xs lg:text-[0.764vw] text-muted-foreground sm:inline">
            {counts[active.key]}
          </span>
          <Icon name="down" className="size-3.5 lg:size-[0.972vw] text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 lg:min-w-[12vw] overflow-hidden p-0">
        <DropdownMenuRadioGroup value={tab} onValueChange={(v) => onChange(v as Tab)}>
          {TABS.map((t) => (
            <DropdownMenuRadioItem
              key={t.key}
              value={t.key}
              className="rounded-none border-b border-border/60 last:border-b-0"
            >
              <span
                className={cn(
                  "size-2 lg:size-[0.556vw] rounded-full",
                  t.key === "all" ? "bg-foreground/30" : BOARD_ACCENT[t.key as BoardStatus]
                )}
              />
              <span>{t.label}</span>
              <span className="ml-1 lg:ml-[0.278vw] tabular-nums text-xs lg:text-[0.764vw] text-muted-foreground">
                {counts[t.key]}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function JobRow({
  job,
  onView,
}: {
  job: Job;
  onView: (leadId: string) => void;
}) {
  const isNew = job.boardStatus === "new";
  const place =
    [job.city, job.state].filter(Boolean).join(", ") || job.zipCode || "—";

  return (
    <tr
      onClick={() => onView(job.leadId)}
      className="group relative cursor-pointer text-sm lg:text-[0.903vw] transition-colors hover:bg-muted/40"
    >
      <td className="relative py-3 lg:py-[0.833vw] pl-5 lg:pl-[1.528vw] align-middle">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-1 lg:w-[0.278vw]",
            BOARD_ACCENT[job.boardStatus]
          )}
        />
        <span className="flex items-center gap-1.5 lg:gap-[0.417vw] font-medium text-foreground">
          {job.homeownerName ?? "New homeowner"}
          {job.hasUnread ? (
            <span
              aria-label="Unread"
              className="size-2 lg:size-[0.556vw] rounded-full bg-primary"
            />
          ) : null}
        </span>
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
        {job.subtype ?? job.serviceName}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
        {place}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium",
            BOARD_META[job.boardStatus].pill
          )}
        >
          {BOARD_META[job.boardStatus].label}
        </span>
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle tabular-nums">
        {job.latestQuoteTotal && !isNew ? (
          formatCurrency(job.latestQuoteTotal)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle whitespace-nowrap text-muted-foreground">
        {isNew && job.slaDeadline ? (
          <SlaCountdown
            deadline={job.slaDeadline}
            compact
            className="text-xs lg:text-[0.833vw]"
          />
        ) : (
          formatDistanceToNow(new Date(job.engagedAt ?? job.offeredAt))
        )}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] pr-4 lg:pr-[1.111vw] align-middle text-right whitespace-nowrap">
        <Button variant="link">
          <Icon name="eye" className="size-4 lg:size-[1.111vw]" /> View details
        </Button>
      </td>
    </tr>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] font-medium",
        className
      )}
    >
      {children}
    </th>
  );
}

function ViewToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex items-center justify-center rounded-md lg:rounded-[0.417vw] p-1.5 lg:p-[0.417vw] transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function RowsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="size-4 lg:size-[1.111vw]">
      <rect x="2" y="3" width="12" height="2" rx="1" />
      <rect x="2" y="7" width="12" height="2" rx="1" />
      <rect x="2" y="11" width="12" height="2" rx="1" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="size-4 lg:size-[1.111vw]">
      <rect x="2" y="2" width="5" height="5" rx="1.2" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" />
    </svg>
  );
}

function ColumnsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="size-4 lg:size-[1.111vw]">
      <rect x="2" y="2" width="3" height="12" rx="1" />
      <rect x="6.5" y="2" width="3" height="12" rx="1" />
      <rect x="11" y="2" width="3" height="12" rx="1" />
    </svg>
  );
}


