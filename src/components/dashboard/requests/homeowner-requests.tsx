"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HomeownerRequestStatus } from "@/lib/data/homeowner";
import { cn } from "@/lib/utils";
import { RequestDetailSheet } from "./request-detail-sheet";
import { RequestsCardGrid } from "./request-cards";
import {
  REQUEST_ACCENT,
  REQUEST_COLUMNS,
  REQUEST_META,
  type RequestCardItem,
} from "./request-meta";

type Tab = HomeownerRequestStatus | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  ...REQUEST_COLUMNS.map((c) => ({ key: c, label: REQUEST_META[c].label })),
];

// Copy for the *filtered* empty view (the homeowner has jobs, just none under
// this tab or matching the search). Warm and plain, like a person would say it.
const TAB_EMPTY: Record<Tab, { title: string; description: string }> = {
  all: {
    title: "Nothing here yet",
    description: "Your posted jobs will show up here as they come in.",
  },
  posted: {
    title: "Nothing waiting on pros",
    description: "Jobs you've just posted sit here until a pro reacts.",
  },
  interested: {
    title: "No pros interested yet",
    description: "When a pro says they're interested, the job moves here.",
  },
  quotes: {
    title: "No quotes to review",
    description: "Jobs with quotes waiting for your decision land here.",
  },
  hired: {
    title: "You haven't hired anyone yet",
    description: "Once you pick a pro for a job, it shows up here.",
  },
  done: {
    title: "Nothing wrapped up yet",
    description: "Finished jobs get collected here so you can look back on them.",
  },
};

/**
 * The homeowner's jobs board — a single card layout (no table/board toggle).
 * A card opens the request detail (its interested contractors + per-contractor
 * chats); quotes are accepted there and in chat, so there's no separate Quotes page.
 */
export function HomeownerRequestsBoard({ items }: { items: RequestCardItem[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: items.length } as Record<Tab, number>;
    for (const col of REQUEST_COLUMNS) c[col] = 0;
    for (const i of items) c[i.requestStatus] += 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (tab !== "all" && i.requestStatus !== tab) return false;
      if (!q) return true;
      return [i.serviceName, i.subtype, i.city, i.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, tab, query]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {/* Search + status filter */}
      <div className="flex min-w-0 items-center gap-2 lg:gap-[0.556vw]">
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

        <div className="shrink-0">
          <StatusFilter tab={tab} counts={counts} onChange={setTab} />
        </div>
      </div>

      {filtered.length === 0 ? (
        query.trim() ? (
          <EmptyState
            size="sm"
            icon="search"
            title="No jobs match your search"
            description={`Nothing here matches "${query.trim()}". Try a different word, or clear the search.`}
          />
        ) : (
          <EmptyState size="sm" icon="paper" {...TAB_EMPTY[tab]} />
        )
      ) : (
        <RequestsCardGrid items={filtered} onView={setOpenLeadId} />
      )}

      <RequestDetailSheet
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
                  t.key === "all" ? "bg-foreground/30" : REQUEST_ACCENT[t.key as HomeownerRequestStatus]
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
