"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "@/lib/format";
import type { AdminStormEvent } from "@/lib/data/admin";
import { SearchBox, Th, Td, Pill } from "./leads-table";

const TYPE_STYLE: Record<AdminStormEvent["eventType"], { label: string; cls: string }> = {
  hail: { label: "Hail", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  high_wind: { label: "High wind", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  storm: { label: "Storm", cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
};

export function StormEventsTable({ events }: { events: AdminStormEvent[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      [e.eventType, e.severity ?? "", ...e.affectedZipCodes].join(" ").toLowerCase().includes(q),
    );
  }, [events, query]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <SearchBox value={query} onChange={setQuery} placeholder="Search by type, severity, ZIP…" />
      {filtered.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No storm events match" description="Try a different type, severity, or ZIP code." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Type</Th>
                <Th>Severity</Th>
                <Th>Affected ZIPs</Th>
                <Th>Alerts sent</Th>
                <Th>Leads</Th>
                <Th>Detected</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => {
                const type = TYPE_STYLE[e.eventType];
                return (
                  <tr key={e.id} className="align-middle">
                    <Td className="pl-5 lg:pl-[1.528vw]"><Pill {...type} /></Td>
                    <Td className="text-muted-foreground">{e.severity ?? "—"}</Td>
                    <Td className="text-muted-foreground">
                      {e.affectedZipCodes.length > 0
                        ? `${e.affectedZipCodes.slice(0, 4).join(", ")}${e.affectedZipCodes.length > 4 ? ` +${e.affectedZipCodes.length - 4}` : ""}`
                        : "—"}
                    </Td>
                    <Td className="tabular-nums text-muted-foreground">{e.alertsSent}</Td>
                    <Td className="tabular-nums text-muted-foreground">{e.leadsGenerated}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(e.detectedAt))}</Td>
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
