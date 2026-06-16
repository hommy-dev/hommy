"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { JobCard as Job } from "@/lib/data/jobs";
import { cn } from "@/lib/utils";
import { JobCard } from "./job-card";
import { JobDetailSheet } from "./job-detail-sheet";
import { BOARD_COLUMNS, BOARD_META } from "./board-meta";

export function JobsBoard({ jobs, canEngage }: { jobs: Job[]; canEngage: boolean }) {
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const filtered = useMemo(() => {
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

  const columns = showClosed ? [...BOARD_COLUMNS, "lost" as const] : BOARD_COLUMNS;
  const byColumn = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const col of [...BOARD_COLUMNS, "lost"]) map.set(col, []);
    for (const j of filtered) map.get(j.boardStatus)?.push(j);
    return map;
  }, [filtered]);

  const lostCount = byColumn.get("lost")?.length ?? 0;

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
        <div className="relative min-w-0 flex-1 sm:max-w-xs lg:sm:max-w-[20vw]">
          <Search
            className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs…"
            className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-9 lg:pl-[2.5vw] pr-3 lg:pr-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
          />
        </div>
        {lostCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className={cn(
              "h-9 lg:h-[2.5vw] rounded-md lg:rounded-[0.556vw] border px-3 lg:px-[0.833vw] text-sm lg:text-[0.903vw] font-medium transition-colors",
              showClosed
                ? "border-foreground/30 bg-muted text-foreground"
                : "border-input bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {showClosed ? "Hide closed" : `Show closed (${lostCount})`}
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No jobs yet. New leads will appear here the moment a homeowner posts.
        </div>
      ) : (
        <div className="flex gap-4 lg:gap-[1.111vw] overflow-x-auto pb-2 lg:pb-[0.556vw]">
          {columns.map((col) => {
            const items = byColumn.get(col) ?? [];
            return (
              <section
                key={col}
                className="w-[17rem] lg:w-[19vw] shrink-0 space-y-3 lg:space-y-[0.833vw]"
              >
                <div className="flex items-center gap-2 lg:gap-[0.556vw] px-0.5">
                  <h2 className="text-sm lg:text-[0.903vw] font-semibold">{BOARD_META[col].label}</h2>
                  <span className="text-xs lg:text-[0.833vw] tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-lg lg:rounded-[0.694vw] border border-dashed border-border/70 p-4 lg:p-[1.111vw] text-center text-xs lg:text-[0.833vw] text-muted-foreground">
                    —
                  </div>
                ) : (
                  <div className="space-y-3 lg:space-y-[0.833vw]">
                    {items.map((j) => (
                      <JobCard key={j.leadId} job={j} canEngage={canEngage} onView={setOpenLeadId} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
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
