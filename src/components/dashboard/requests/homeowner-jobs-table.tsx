"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import type { HomeownerRequestStatus } from "@/lib/data/homeowner";
import { formatCurrency, formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RequestDetailSheet } from "./request-detail-sheet";
import { REQUEST_COLUMNS, REQUEST_META, type RequestCardItem } from "./request-meta";

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
 * The homeowner's jobs board — the same tabbed-table layout the contractor uses,
 * scoped to the homeowner's own requests. A row opens the request detail (its
 * interested contractors + per-contractor chats); quotes live there and in the
 * chat, so there's no separate Quotes page.
 */
export function HomeownerJobsTable({ items }: { items: RequestCardItem[] }) {
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
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 lg:gap-[0.417vw]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-sm lg:text-[0.903vw] font-medium transition-colors",
              tab === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
            <span className={cn("text-xs lg:text-[0.764vw] tabular-nums", tab === t.key ? "text-background/70" : "text-muted-foreground/70")}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative min-w-0 sm:max-w-xs lg:sm:max-w-[20vw]">
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
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Work</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th>Quotes</Th>
                <Th>Posted</Th>
                <th className="px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] pr-4 lg:pr-[1.111vw] text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((i) => (
                <Row key={i.id} item={i} onView={setOpenLeadId} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RequestDetailSheet
        leadId={openLeadId}
        open={openLeadId !== null}
        onOpenChange={(o) => !o && setOpenLeadId(null)}
      />
    </div>
  );
}

function Row({ item, onView }: { item: RequestCardItem; onView: (leadId: string) => void }) {
  const place = [item.city, item.state].filter(Boolean).join(", ") || item.zipCode || "—";
  const meta = REQUEST_META[item.requestStatus];

  return (
    <tr
      onClick={() => onView(item.id)}
      className="group cursor-pointer text-sm lg:text-[0.903vw] transition-colors hover:bg-muted/40"
    >
      <td className="py-3 lg:py-[0.833vw] pl-5 lg:pl-[1.528vw] align-middle font-medium capitalize text-foreground">
        {item.subtype ?? item.serviceName}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
        {place}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
        <span className={cn("inline-flex rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium", meta.pill)}>
          {meta.label}
        </span>
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle tabular-nums">
        {item.quoteCount > 0 ? (
          <span>
            {item.bestQuoteTotal ? `from ${formatCurrency(item.bestQuoteTotal)}` : `${item.quoteCount}`}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle whitespace-nowrap text-muted-foreground">
        {formatDistanceToNow(new Date(item.createdAt))}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] pr-4 lg:pr-[1.111vw] align-middle text-right">
        <span className="inline-flex items-center rounded-md lg:rounded-[0.417vw] border border-border bg-card px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold transition-colors group-hover:bg-muted">
          View
        </span>
      </td>
    </tr>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] font-medium", className)}>
      {children}
    </th>
  );
}
