"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { URGENCY_LABEL } from "@/components/dashboard/jobs/board-meta";
import type { AdminLeadRow } from "@/lib/data/admin";

const STATUS_STYLE: Record<AdminLeadRow["status"], { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  awarded: { label: "Awarded", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
};

export function LeadsTable({ leads }: { leads: AdminLeadRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.homeownerName, l.title, l.city, l.state, l.awardedToName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [leads, query]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <SearchBox value={query} onChange={setQuery} placeholder="Search leads…" />
      {filtered.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No leads match" description="Try a different homeowner, service, or location." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Homeowner</Th>
                <Th>Work</Th>
                <Th>Location</Th>
                <Th>Urgency</Th>
                <Th>Status</Th>
                <Th>Engaged</Th>
                <Th>Awarded to</Th>
                <Th>Posted</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => {
                const status = STATUS_STYLE[l.status];
                const place = [l.city, l.state].filter(Boolean).join(", ") || "—";
                return (
                  <tr key={l.id} className="align-middle">
                    <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">{l.homeownerName ?? "Homeowner"}</Td>
                    <Td className="capitalize text-muted-foreground">{l.title}</Td>
                    <Td className="text-muted-foreground">{place}</Td>
                    <Td className="text-muted-foreground">{URGENCY_LABEL[l.urgency] ?? l.urgency}</Td>
                    <Td><Pill {...status} /></Td>
                    <Td className="tabular-nums text-muted-foreground">{l.engagedCount}/{l.recipientCount}</Td>
                    <Td className="text-muted-foreground">{l.awardedToName ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(l.createdAt))}</Td>
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

// Shared bits for the admin tables.
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0 sm:max-w-xs lg:sm:max-w-[20vw]">
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-9 lg:pl-[2.5vw] pr-3 lg:pr-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
      />
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] font-medium", className)}>{children}</th>;
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle", className)}>{children}</td>;
}

export function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={cn("inline-flex rounded-full text-nowrap px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium", cls)}>
      {label}
    </span>
  );
}
