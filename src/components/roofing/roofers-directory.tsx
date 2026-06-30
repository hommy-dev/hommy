"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { GooglePlacesInput, type PlaceResult } from "@/components/ui/google-places-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { ProCard } from "@/lib/data/locations";
import type { RoofersSort } from "@/lib/data/roofers";
import { searchRoofers } from "@/lib/actions/roofers";
import { RooferCard } from "./roofer-card";
import { HeroAdaptiveGrid } from "./hero-adaptive-grid";

type Opt = { label: string; value: string };
const SERVICE_OPTS: Opt[] = [
  { label: "All services", value: "" },
  { label: "Repair", value: "Repair" },
  { label: "Replacement", value: "Replacement" },
  { label: "Inspection", value: "Inspection" },
  { label: "Storm damage", value: "Storm Damage" },
];
const SORT_OPTS: Opt[] = [
  { label: "Best match", value: "best" },
  { label: "Top rated", value: "rating" },
  { label: "Most reviewed", value: "reviews" },
  { label: "Newest", value: "newest" },
];

type Near = { lat: number; lng: number; label: string } | null;

/** Fixed page scope (state hub / city page). When set, the location search is hidden. */
export type DirectoryScope = {
  stateSlug?: string;
  near?: { lat: number; lng: number } | null;
  placeLabel?: string;
} | null;

const PAGE_SIZE = 12;

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
}) {
  const current = options.find((o) => o.value === value)?.label ?? options[0].label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between gap-2 rounded-md bg-card px-3.5 py-2.5 text-sm ring-1 ring-foreground/15 transition-colors hover:ring-foreground/30">
          <span className="text-muted-foreground">{label}</span>
          <span className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground">
            <span className="truncate text-sm lg:text-[0.9vw]">{current}</span>
            <Icon name="down" className="size-4 lg:size-[1vw] shrink-0 text-muted-foreground" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RoofersDirectory({
  initialItems,
  initialTotal,
  initialHasMore,
  scope = null,
  initialSubtype = null,
  initialNear = null,
  richSingleColumn = false,
  quoteHref = "/get-a-quote",
}: {
  initialItems: ProCard[];
  initialTotal: number;
  initialHasMore: boolean;
  scope?: DirectoryScope;
  initialSubtype?: string | null;
  /** Seed the "near" filter (e.g. the homeowner's last job) — editable/clearable,
   *  unlike `scope` which is fixed and hides the location search. */
  initialNear?: Near;
  /** Homeowner dashboard only: when the cards area is narrow on desktop (the
   *  dashboard sidebar is open), show one wide "hero" card per company instead of
   *  cramped 2-up cards, with a smooth crossfade on toggle. */
  richSingleColumn?: boolean;
  quoteHref?: string;
}) {
  const scoped = !!(scope && (scope.stateSlug || scope.near));
  // The dashboard content scrolls in its own pane just below a 3.889vw header, so
  // the filter sidebar should stick high; the public site has a taller fixed
  // header, so it needs more offset.
  const asideStickyTop = richSingleColumn ? "top-[0vw]" : "top-[2vw]";

  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [q, setQ] = useState("");
  const [subtype, setSubtype] = useState<string | null>(initialSubtype);
  const [near, setNear] = useState<Near>(initialNear);
  const [sort, setSort] = useState<RoofersSort>("best");
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeParams = (userNear: Near) =>
    scope?.stateSlug
      ? { stateSlug: scope.stateSlug, near: null as { lat: number; lng: number } | null }
      : scope?.near
        ? { near: scope.near, stateSlug: undefined as string | undefined }
        : {
            near: userNear ? { lat: userNear.lat, lng: userNear.lng } : null,
            stateSlug: undefined as string | undefined,
          };

  const run = useCallback(
    (nextPage: number, f: { q: string; subtype: string | null; near: Near; sort: RoofersSort }) => {
      const p = placeParams(f.near);
      startTransition(async () => {
        const res = await searchRoofers({
          q: f.q || undefined,
          subtype: f.subtype || undefined,
          near: p.near,
          stateSlug: p.stateSlug,
          sort: f.sort,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(nextPage);
        setItems((prev) => (nextPage === 0 ? res.items : [...prev, ...res.items]));
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scope is stable per mount
    [],
  );

  const onQ = (value: string) => {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => run(0, { q: value, subtype, near, sort }), 300);
  };
  const onSubtype = (value: string | null) => {
    setSubtype(value);
    run(0, { q, subtype: value, near, sort });
  };
  const onSort = (value: RoofersSort) => {
    setSort(value);
    run(0, { q, subtype, near, sort: value });
  };
  const onPlace = (pl: PlaceResult) => {
    const label = [pl.city, pl.state].filter(Boolean).join(", ") || pl.formattedAddress;
    const n = { lat: pl.lat, lng: pl.lng, label };
    setNear(n);
    run(0, { q, subtype, near: n, sort });
  };
  const clearNear = () => {
    setNear(null);
    run(0, { q, subtype, near: null, sort });
  };

  const activeCount =
    (subtype ? 1 : 0) + (!scoped && near ? 1 : 0) + (q ? 1 : 0) + (sort !== "best" ? 1 : 0);
  const placeSuffix = scoped && scope?.placeLabel ? ` in ${scope.placeLabel}` : near ? ` near ${near.label}` : "";

  // Search + filters — reused in the desktop sidebar and the mobile drawer.
  const controls = (
    <div className="space-y-3">
      {scoped ? (
        <div className="flex items-center gap-2 rounded-md bg-card px-3.5 ring-1 ring-foreground/15 focus-within:ring-foreground/30">
          <Icon name="search" className="size-4 lg:size-[1vw] shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Search by company name"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      ) : near ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-card px-3.5 py-2.5 ring-1 ring-foreground/15">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <Icon name="location" className="size-4 lg:size-[1vw] shrink-0 text-primary" />
            <span className="truncate">Near {near.label}</span>
          </span>
          <button
            onClick={clearNear}
            aria-label="Clear location"
            className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <Icon name="close" className="size-4 lg:size-[1vw]" />
          </button>
        </div>
      ) : (
        <GooglePlacesInput
          mode="cities"
          onPlaceSelect={onPlace}
          placeholder="Search a city or area"
          className="h-11 rounded-md bg-card"
        />
      )}

      <FilterDropdown
        label="Service"
        value={subtype ?? ""}
        options={SERVICE_OPTS}
        onChange={(v) => onSubtype(v || null)}
      />
      <FilterDropdown label="Sort" value={sort} options={SORT_OPTS} onChange={(v) => onSort(v as RoofersSort)} />
    </div>
  );

  const grid =
    items.length === 0 ? (
      <div className="rounded-lg bg-card p-8 text-center ring-1 ring-foreground/10 lg:rounded-[0.556vw] lg:p-[2vw]">
        <p className="text-muted-foreground lg:text-[1.05vw]">
          No roofing companies match your search yet. Try a wider area or post your job and we&apos;ll match
          you with local roofers.
        </p>
      </div>
    ) : richSingleColumn ? (
      <div className={cn("transition-opacity", pending && "opacity-60")}>
        <HeroAdaptiveGrid items={items} quoteHref={quoteHref} />
      </div>
    ) : (
      <div className={cn("grid grid-cols-1 gap-4 transition-opacity @4xl:grid-cols-2 lg:gap-[1.111vw]", pending && "opacity-60")}>
        {items.map((p) => (
          <RooferCard key={p.id} pro={p} quoteHref={quoteHref} />
        ))}
      </div>
    );

  return (
    <div className="lg:flex lg:gap-[2vw]">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 lg:block lg:w-[20vw]">
        <div className={cn("sticky space-y-4 lg:space-y-[1.2vw]", asideStickyTop)}>
          {controls}
          <div className="rounded-lg border bg-card p-5 lg:rounded-[0.556vw] lg:p-[1.2vw]">
            <p className="font-sebenta text-lg font-bold leading-snug lg:text-[1.15vw]">
              Want roofers to come to you?
            </p>
            <p className="mt-1.5 text-sm lg:mt-[0.4vw] lg:text-[0.82vw]">
              Post your job free and a few vetted local roofers reach out. You choose who you talk to.
            </p>
            <Link
              href={quoteHref}
              className="mt-4 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 lg:mt-[1vw] lg:gap-[0.4vw] lg:rounded-[0.4vw] lg:py-[0.6vw] lg:text-[0.85vw]"
            >
              Get free quotes
              <Icon name="arrow-right" className="size-4 lg:size-[1vw]" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main — a query container so the card grid reacts to the ACTUAL space it
          has (which shrinks when an outer dashboard sidebar is also open), not the
          raw viewport. Two columns only when the cards area is genuinely wide. */}
      <div className="@container min-w-0 flex-1">
        {/* Mobile control bar */}
        <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "roofer" : "roofers"}
            {placeSuffix}
          </p>
          <button
            onClick={() => setDrawer(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-card px-3.5 py-2 text-sm font-medium text-foreground ring-1 ring-foreground/15"
          >
            <Icon name="filter" className="size-4" />
            Filter{activeCount > 0 ? ` · ${activeCount}` : ""}
          </button>
        </div>

        {/* Desktop count */}
        {/* <p className="mb-4 hidden text-sm text-muted-foreground lg:block lg:text-[0.9vw]">
          {total} {total === 1 ? "company" : "companies"}
          {placeSuffix}
        </p> */}

        {grid}

        {hasMore && items.length > 0 && (
          <div className="mt-8 text-center lg:mt-[2vw]">
            <button
              onClick={() => run(page + 1, { q, subtype, near, sort })}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-card px-6 py-3 font-semibold text-foreground ring-1 ring-foreground/15 transition-colors hover:ring-foreground/30 disabled:opacity-60 lg:gap-[0.4vw] lg:rounded-[0.4vw] lg:px-[1.5vw] lg:py-[0.7vw] lg:text-[1vw]"
            >
              {pending ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {/* Mobile floating CTA — sticks while browsing the list, tucks away after */}
        <div className="pointer-events-none sticky bottom-3 z-30 mt-6 flex justify-center lg:hidden">
          <Link
            href={quoteHref}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground ring-4 ring-background"
          >
            Get free quotes
            <Icon name="arrow-right" className="size-4" />
          </Link>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Drawer open={drawer} onOpenChange={setDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter roofers</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">
            {controls}
            <button
              onClick={() => setDrawer(false)}
              className="mt-5 flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Show {total} {total === 1 ? "roofer" : "roofers"}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
