"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminCreditLogRow } from "@/lib/data/admin";
import { SearchBox, Th, Td } from "./leads-table";

const KIND_LABEL: Record<AdminCreditLogRow["kind"], string> = {
  signup_bonus: "Signup bonus",
  purchase: "Credit purchase",
  plan_grant: "Monthly plan credits",
  lead_engagement: "Lead engaged",
  lead_won: "Lead won",
  ai_agent: "AI agent",
  marketing: "Marketing",
  refund: "Refund",
  promo: "Promo credits",
  expiry: "Credits expired",
  adjustment: "Admin adjustment",
  referral: "Referral bonus",
};

export function CreditLog({ rows }: { rows: AdminCreditLogRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.companyName, KIND_LABEL[r.kind], r.createdByName, r.sourceType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <SearchBox value={query} onChange={setQuery} placeholder="Search by company, type, source…" />
      {filtered.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No entries match" description="Try a different company, activity type, or source." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Company</Th>
                <Th>Activity</Th>
                <Th>By</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Balance</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const positive = r.amount >= 0;
                return (
                  <tr key={r.id} className="align-middle">
                    <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">{r.companyName ?? "—"}</Td>
                    <Td className="text-muted-foreground">{KIND_LABEL[r.kind] ?? r.kind}</Td>
                    <Td className="text-muted-foreground">{r.createdByName ?? "System"}</Td>
                    <Td
                      className={cn(
                        "text-right font-medium tabular-nums",
                        positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                      )}
                    >
                      {positive ? "+" : "−"}
                      {Math.abs(r.amount)}
                    </Td>
                    <Td className="text-right tabular-nums text-muted-foreground">{r.balanceAfter}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt))}</Td>
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
