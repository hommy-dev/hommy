"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { DashboardLead } from "@/lib/data/dashboard";
import { formatDistanceToNow } from "@/lib/format";
import { showToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SlaCountdown } from "./sla-countdown";

const URGENCY: Record<
  DashboardLead["urgency"],
  { label: string; pill: string; bar: string }
> = {
  emergency: {
    label: "Emergency",
    pill: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    bar: "bg-red-500",
  },
  within_week: {
    label: "This week",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  within_month: {
    label: "This month",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  planning: {
    label: "Planning",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    bar: "bg-slate-400",
  },
};

const STATUS: Record<
  DashboardLead["recipientStatus"],
  { label: string; pill: string }
> = {
  offered: { label: "New", pill: "bg-secondary text-secondary-foreground" },
  viewed: { label: "Viewed", pill: "bg-muted text-foreground/70" },
  engaged: { label: "Engaged", pill: "bg-success/15 text-success" },
  won: { label: "Won", pill: "bg-success text-success-foreground" },
  declined: { label: "Declined", pill: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", pill: "bg-muted text-muted-foreground" },
  lost: { label: "Lost", pill: "bg-muted text-muted-foreground" },
};

type LeadGroup = "new" | "engaged" | "won" | "closed";
type Group = "all" | LeadGroup;

const GROUP_OF: Record<DashboardLead["recipientStatus"], LeadGroup> = {
  offered: "new",
  viewed: "new",
  engaged: "engaged",
  won: "won",
  declined: "closed",
  expired: "closed",
  lost: "closed",
};

const FILTERS: { value: Group; label: string }[] = [
  { value: "all", label: "All leads" },
  { value: "new", label: "New" },
  { value: "engaged", label: "Engaged" },
  { value: "won", label: "Won" },
  { value: "closed", label: "Closed" },
];

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function isOpenOffer(l: DashboardLead) {
  return l.recipientStatus === "offered" || l.recipientStatus === "viewed";
}
function isLocked(l: DashboardLead) {
  return l.leadStatus === "filled" || l.leadStatus === "awarded";
}

export function LeadsTable({
  leads,
  canEngage,
}: {
  leads: DashboardLead[];
  canEngage: boolean;
}) {
  const [group, setGroup] = useState<Group>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 7-day KPIs with momentum vs the prior 7 days.
  const stats = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const inWindow = (d: Date | null, from: number, to: number) => {
      if (!d) return false;
      const t = d.getTime();
      return t >= from && t < to;
    };
    const trend = (dates: (Date | null)[]) => ({
      value: dates.filter((d) => inWindow(d, now - PERIOD_MS, now + 1)).length,
      prev: dates.filter((d) => inWindow(d, now - 2 * PERIOD_MS, now - PERIOD_MS))
        .length,
    });
    const wonDates = leads
      .filter((l) => l.recipientStatus === "won")
      .map((l) => l.awardedAt ?? l.engagedAt);
    const decided = leads.filter((l) =>
      ["engaged", "won", "lost"].includes(l.recipientStatus)
    ).length;
    const won = leads.filter((l) => l.recipientStatus === "won").length;
    return {
      newL: trend(leads.map((l) => l.offeredAt)),
      engaged: trend(leads.map((l) => l.engagedAt)),
      won: trend(wonDates),
      winRate: decided > 0 ? Math.round((won / decided) * 100) : null,
      winNum: won,
      winDen: decided,
    };
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (group !== "all" && GROUP_OF[l.recipientStatus] !== group)
        return false;
      if (!q) return true;
      const hay = [
        l.homeownerName,
        l.serviceName,
        l.city,
        l.state,
        ...l.subtypes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, group, query]);

  const allSelected =
    filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      filtered.forEach((l) => next.add(l.id));
      return next;
    });
  }

  function engage(ids: string[]) {
    showToast(
      `Engaging ${
        ids.length > 1 ? `${ids.length} leads` : "this lead"
      } arrives in the next update.`,
      { type: "info" }
    );
  }

  function exportCsv(ids: string[]) {
    const rows = leads.filter((l) => ids.includes(l.id));
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = [
      "Homeowner",
      "Service",
      "Work",
      "Urgency",
      "Status",
      "Location",
      "Offered",
    ];
    const body = rows.map((l) =>
      [
        l.homeownerName ?? "",
        l.serviceName,
        l.subtypes.join("; "),
        URGENCY[l.urgency].label,
        STATUS[l.recipientStatus].label,
        [l.city, l.state].filter(Boolean).join(", "),
        new Date(l.offeredAt).toISOString(),
      ]
        .map((v) => esc(String(v)))
        .join(",")
    );
    const csv = [head.map(esc).join(","), ...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${rows.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {/* KPIs — last 30 days, with momentum */}
      <div>
        <p className="mb-2 lg:mb-[0.556vw] text-xs lg:text-[0.833vw] font-medium text-muted-foreground">
          Last 30 days
        </p>
        <div className="grid grid-cols-2 gap-3 lg:gap-[0.833vw] sm:grid-cols-4">
          <Stat
            label="New leads"
            value={stats.newL.value}
            last={stats.newL.value}
            prev={stats.newL.prev}
          />
          <Stat
            label="Engaged"
            value={stats.engaged.value}
            last={stats.engaged.value}
            prev={stats.engaged.prev}
          />
          <Stat
            label="Won"
            value={stats.won.value}
            last={stats.won.value}
            prev={stats.won.prev}
          />
          <Stat
            label="Win rate"
            value={stats.winRate === null ? "—" : `${stats.winRate}%`}
            sub={
              stats.winDen > 0
                ? `${stats.winNum} of ${stats.winDen} won`
                : "No outcomes yet"
            }
          />
        </div>
      </div>

      {/* Toolbar — search first, then filter */}
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
            placeholder="Search leads…"
            className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-9 lg:pl-[2.5vw] pr-3 lg:pr-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
          />
        </div>
        <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
          <SelectTrigger className="h-9 lg:h-[2.5vw] gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border-input bg-card">
            <SlidersHorizontal
              className="size-4 lg:size-[1.111vw] text-muted-foreground"
              strokeWidth={2}
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No leads in this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <th className="w-10 lg:w-[3vw] py-2.5 lg:py-[0.694vw] pl-4 lg:pl-[1.111vw]">
                  <Check
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <Th>Lead</Th>
                <Th>Work</Th>
                <Th>Urgency</Th>
                <Th>Status</Th>
                <Th>Time left</Th>
                <Th>Cost</Th>
                <th className="w-28 lg:w-[9vw] px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] pr-4 lg:pr-[1.111vw] text-right font-medium">
                  Offered
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => {
                const u = URGENCY[l.urgency];
                const st = STATUS[l.recipientStatus];
                const place =
                  [l.city, l.state].filter(Boolean).join(", ") || "—";
                const open = isOpenOffer(l);
                const locked = isLocked(l);
                const showEngage = canEngage && open && !locked;
                const isSel = selected.has(l.id);
                return (
                  <tr
                    key={l.id}
                    className={cn(
                      "group relative text-sm lg:text-[0.903vw] transition-colors hover:bg-muted/40",
                      isSel && "bg-muted/40"
                    )}
                  >
                    <td className="py-3 lg:py-[0.833vw] pl-4 lg:pl-[1.111vw] align-middle">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-0 left-0 w-0.5 lg:w-[0.139vw]",
                          u.bar
                        )}
                      />
                      <Check
                        checked={isSel}
                        onChange={() => toggle(l.id)}
                        aria-label="Select lead"
                      />
                    </td>
                    <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
                      <p className="font-medium text-foreground">
                        {l.homeownerName ?? "New homeowner"}
                      </p>
                      <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
                        {place}
                      </p>
                    </td>
                    <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
                      <div className="flex flex-wrap gap-1 lg:gap-[0.278vw]">
                        {l.subtypes.length > 0 ? (
                          l.subtypes.map((s) => (
                            <span
                              key={s}
                              className="rounded-md lg:rounded-[0.417vw] bg-muted px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium text-foreground/75"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            {l.serviceName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
                      <Pill className={u.pill}>{u.label}</Pill>
                    </td>
                    <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
                      <Pill className={st.pill}>{st.label}</Pill>
                    </td>
                    <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle whitespace-nowrap">
                      {open && l.slaDeadline && l.leadStatus === "open" ? (
                        <SlaCountdown
                          deadline={l.slaDeadline}
                          compact
                          className="text-xs lg:text-[0.833vw]"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle whitespace-nowrap text-muted-foreground">
                      {open && !locked
                        ? `${l.engagementCreditCost} credit${
                            l.engagementCreditCost === 1 ? "" : "s"
                          }`
                        : "—"}
                    </td>
                    <td className="w-28 lg:w-[9vw] px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] pr-4 lg:pr-[1.111vw] align-middle text-right whitespace-nowrap">
                      {showEngage ? (
                        <>
                          <span className="text-muted-foreground group-hover:hidden">
                            {formatDistanceToNow(new Date(l.offeredAt))}
                          </span>
                          <button
                            type="button"
                            onClick={() => engage([l.id])}
                            className="hidden rounded-md lg:rounded-[0.417vw] bg-foreground px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold text-background transition-colors hover:bg-foreground/90 group-hover:inline-flex"
                          >
                            Engage
                          </button>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(l.offeredAt))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selection action bar — frosted glass, slides up */}
      {selected.size > 0 ? (
        <div className="pointer-events-none sticky bottom-4 lg:bottom-[1.111vw] z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 lg:gap-[0.833vw] rounded-md lg:rounded-[0.5vw] border border-white/10 bg-foreground/70 px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] text-sm lg:text-[0.903vw] text-background shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
            <span className="font-medium tabular-nums">
              {selected.size} selected
            </span>
            <span className="h-4 lg:h-[1.111vw] w-px bg-background/25" />
            {canEngage ? (
              <button
                type="button"
                onClick={() => engage([...selected])}
                className="font-medium transition-opacity hover:opacity-80"
              >
                Engage
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => exportCsv([...selected])}
              className="font-medium transition-opacity hover:opacity-80"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-background/70 transition-opacity hover:opacity-80"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  last,
  prev,
}: {
  label: string;
  value: number | string;
  sub?: string;
  last?: number;
  prev?: number;
}) {
  return (
    <div className="rounded-md lg:rounded-[0.5vw] border border-border bg-card px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
      <p className="text-xs lg:text-[0.833vw] text-muted-foreground">{label}</p>
      <div className="mt-4 lg:mt-[1.5vw] flex items-center gap-2 lg:gap-[0.556vw]">
        <p className="text-2xl lg:text-[1.667vw] font-semibold tabular-nums leading-none">
          {value}
        </p>
        {last !== undefined && prev !== undefined ? (
          <Trend last={last} prev={prev} />
        ) : null}
        {sub ? (
          <p className="mt-1.5 lg:mt-[0.417vw] text-xs lg:text-[0.764vw] text-muted-foreground">
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Trend({ last, prev }: { last: number; prev: number }) {
  if (last === 0 && prev === 0) return null;
  const isNew = prev === 0 && last > 0;
  const up = last >= prev;
  const pct = prev === 0 ? null : Math.round(((last - prev) / prev) * 100);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 lg:gap-[0.139vw] rounded-md lg:rounded-[0.417vw] px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium",
        up
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
      )}
    >
      <Arrow up={up} />
      {isNew ? "New" : `${up ? "+" : "−"}${Math.abs(pct ?? 0)}%`}
    </span>
  );
}

function Arrow({ up }: { up: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="lg:size-[0.694vw]"
    >
      <path
        d={up ? "M3 7.5L6 4.5L9 7.5" : "M3 4.5L6 7.5L9 4.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] font-medium">
      {children}
    </th>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md lg:rounded-[0.417vw] px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

function Check({
  checked,
  onChange,
  ...props
}: {
  checked: boolean;
  onChange: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "grid size-4 lg:size-[1.111vw] place-items-center rounded-[4px] lg:rounded-[0.278vw] border transition-colors",
        checked
          ? "border-foreground bg-foreground text-background"
          : "border-input bg-card hover:border-foreground/40"
      )}
      {...props}
    >
      {checked ? (
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="lg:size-[0.694vw]"
        >
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
