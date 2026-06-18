"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import type { BoardStatus, JobCard as Job } from "@/lib/data/jobs";
import { formatDistanceToNow, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SlaCountdown } from "../leads/sla-countdown";
import { JobDetailSheet } from "./job-detail-sheet";
import { EngageConfirm } from "./engage-confirm";
import { BOARD_ACCENT, BOARD_META } from "./board-meta";

type Tab = BoardStatus | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "talking", label: "Talking" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "done", label: "Done" },
  { key: "lost", label: "Closed" },
];

export function JobsTable({ jobs, canEngage }: { jobs: Job[]; canEngage: boolean }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: 0, new: 0, talking: 0, quoted: 0, won: 0, done: 0, lost: 0 };
    for (const j of jobs) {
      c[j.boardStatus] += 1;
      if (j.boardStatus !== "lost") c.all += 1;
    }
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (tab === "all" ? j.boardStatus === "lost" : j.boardStatus !== tab) return false;
      if (!q) return true;
      return [j.homeownerName, j.serviceName, j.subtype, j.city, j.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, tab, query]);

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

      {filtered.length === 0 ? (
        <div className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No jobs in this view.
        </div>
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
                <JobRow key={j.leadId} job={j} canEngage={canEngage} onView={setOpenLeadId} />
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

function JobRow({
  job,
  canEngage,
  onView,
}: {
  job: Job;
  canEngage: boolean;
  onView: (leadId: string) => void;
}) {
  const isNew = job.boardStatus === "new";
  const place = [job.city, job.state].filter(Boolean).join(", ") || job.zipCode || "—";

  return (
    <tr
      onClick={() => onView(job.leadId)}
      className="group relative cursor-pointer text-sm lg:text-[0.903vw] transition-colors hover:bg-muted/40"
    >
      <td className="relative py-3 lg:py-[0.833vw] pl-5 lg:pl-[1.528vw] align-middle">
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1 lg:w-[0.278vw]", BOARD_ACCENT[job.boardStatus])} />
        <span className="flex items-center gap-1.5 lg:gap-[0.417vw] font-medium text-foreground">
          {job.homeownerName ?? "New homeowner"}
          {job.hasUnread ? <span aria-label="Unread" className="size-2 lg:size-[0.556vw] rounded-full bg-primary" /> : null}
        </span>
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
        {job.subtype ?? job.serviceName}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
        {place}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
        <span className={cn("inline-flex rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium", BOARD_META[job.boardStatus].pill)}>
          {BOARD_META[job.boardStatus].label}
        </span>
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle tabular-nums">
        {job.latestQuoteTotal && !isNew ? formatCurrency(job.latestQuoteTotal) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle whitespace-nowrap text-muted-foreground">
        {isNew && job.slaDeadline ? (
          <SlaCountdown deadline={job.slaDeadline} compact className="text-xs lg:text-[0.833vw]" />
        ) : (
          formatDistanceToNow(new Date(job.engagedAt ?? job.offeredAt))
        )}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] pr-4 lg:pr-[1.111vw] align-middle text-right whitespace-nowrap">
        {isNew ? (
          <EngageConfirm
            leadId={job.leadId}
            engagementCreditCost={job.engagementCreditCost}
            homeownerName={job.homeownerName}
            disabled={!canEngage}
            stopPropagation
            triggerClassName="inline-flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] bg-foreground px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
            triggerContent={
              <>
                <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
                {`Chat · ${job.engagementCreditCost} cr`}
              </>
            }
          />
        ) : job.conversationId ? (
          <Link
            href={`/contractor/messages/${job.conversationId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] border border-border bg-card px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold transition-colors hover:bg-muted"
          >
            <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Open chat
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
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
