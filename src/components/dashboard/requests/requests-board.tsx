"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RequestCard } from "./request-card";
import { RequestDetailSheet } from "./request-detail-sheet";
import { REQUEST_COLUMNS, REQUEST_META, type RequestCardItem } from "./request-meta";

export function RequestsBoard({ items }: { items: RequestCardItem[] }) {
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.serviceName, i.subtype, i.city, i.state].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [items, query]);

  const byColumn = useMemo(() => {
    const map = new Map<string, RequestCardItem[]>();
    for (const col of REQUEST_COLUMNS) map.set(col, []);
    for (const i of filtered) map.get(i.requestStatus)?.push(i);
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="relative min-w-0 sm:max-w-xs lg:sm:max-w-[20vw]">
        <Search
          className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search requests…"
          className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-9 lg:pl-[2.5vw] pr-3 lg:pr-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
        />
      </div>

      <div className="flex gap-4 lg:gap-[1.111vw] overflow-x-auto pb-2 lg:pb-[0.556vw]">
        {REQUEST_COLUMNS.map((col) => {
          const colItems = byColumn.get(col) ?? [];
          return (
            <section
              key={col}
              className="w-[17rem] lg:w-[19vw] shrink-0 space-y-3 lg:space-y-[0.833vw]"
            >
              <div className="flex items-center gap-2 lg:gap-[0.556vw] px-0.5">
                <h2 className="text-sm lg:text-[0.903vw] font-semibold">{REQUEST_META[col].label}</h2>
                <span className="text-xs lg:text-[0.833vw] tabular-nums text-muted-foreground">
                  {colItems.length}
                </span>
              </div>
              {colItems.length === 0 ? (
                <div className="rounded-lg lg:rounded-[0.694vw] border border-dashed border-border/70 p-4 lg:p-[1.111vw] text-center text-xs lg:text-[0.833vw] text-muted-foreground">
                  —
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-[0.833vw]">
                  {colItems.map((i) => (
                    <RequestCard key={i.id} item={i} onView={setOpenLeadId} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <RequestDetailSheet
        leadId={openLeadId}
        open={openLeadId !== null}
        onOpenChange={(o) => !o && setOpenLeadId(null)}
      />
    </div>
  );
}
