"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDistanceToNow } from "@/lib/format";
import type { AdminJobRow } from "@/lib/data/admin";
import { SearchBox, Th, Td, Pill } from "./leads-table";

const STAGE_STYLE: Record<AdminJobRow["stage"], { label: string; cls: string }> = {
  new_lead: { label: "New", cls: "bg-muted text-foreground/70" },
  estimate_sent: { label: "Quoted", cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
  in_progress: { label: "In progress", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  lost: { label: "Lost", cls: "bg-muted text-muted-foreground" },
};

export function AdminJobsTable({ jobs }: { jobs: AdminJobRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((x) =>
      [x.companyName, x.homeownerName, x.title].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [jobs, query]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <SearchBox value={query} onChange={setQuery} placeholder="Search by company, homeowner, work…" />
      {filtered.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No jobs match" description="Try a different company, homeowner, or service." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Company</Th>
                <Th>Homeowner</Th>
                <Th>Work</Th>
                <Th>Stage</Th>
                <Th>Value</Th>
                <Th>Started</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((x) => {
                const stage = STAGE_STYLE[x.stage];
                return (
                  <tr key={x.projectId} className="align-middle">
                    <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">{x.companyName ?? "—"}</Td>
                    <Td className="text-muted-foreground">{x.homeownerName ?? "—"}</Td>
                    <Td className="capitalize text-muted-foreground">{x.title}</Td>
                    <Td><Pill {...stage} /></Td>
                    <Td className="tabular-nums">{x.estimateValue ? formatCurrency(x.estimateValue) : "—"}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(x.createdAt))}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
