"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDistanceToNow } from "@/lib/format";
import type { AdminQuoteRow } from "@/lib/data/admin";
import { SearchBox, Th, Td, Pill } from "./leads-table";

const STATUS_STYLE: Record<AdminQuoteRow["status"], { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
};

export function QuotesTable({ quotes }: { quotes: AdminQuoteRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((x) =>
      [x.companyName, x.homeownerName].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [quotes, query]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <SearchBox value={query} onChange={setQuery} placeholder="Search by company or homeowner…" />
      {filtered.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No quotes match" description="Try a different company or homeowner name." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Company</Th>
                <Th>Homeowner</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Sent</Th>
                <Th>Accepted</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((x) => {
                const status = STATUS_STYLE[x.status];
                return (
                  <tr key={x.estimateId} className="align-middle">
                    <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">{x.companyName ?? "—"}</Td>
                    <Td className="text-muted-foreground">{x.homeownerName ?? "—"}</Td>
                    <Td className="tabular-nums">{x.total ? formatCurrency(x.total) : "—"}</Td>
                    <Td><Pill {...status} /></Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{x.sentAt ? formatDistanceToNow(new Date(x.sentAt)) : "—"}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{x.acceptedAt ? formatDistanceToNow(new Date(x.acceptedAt)) : "—"}</Td>
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
