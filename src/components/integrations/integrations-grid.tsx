"use client";

// The main /contractor/integrations surface: a searchable, tabbed grid of
// provider cards built from the static INTEGRATION_PROVIDERS constant — so the
// whole grid paints instantly. Only the data-dependent bits (the Google card's
// connected Switch and the manage dialog) stream in: the page passes an
// unawaited promise that those inner pieces `use()` inside their own Suspense.

import { Suspense, use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoogleBusinessPicker } from "./google-business-picker";
import { fetchPlaceContent } from "@/lib/integrations/google-places-client";
import {
  connectGooglePlace,
  disconnectGooglePlace,
  refreshGooglePlace,
} from "@/lib/actions/integrations";
import {
  GOOGLE_PLACES_PROVIDER,
  INTEGRATION_PROVIDERS,
  type IntegrationCategory,
} from "@/lib/integrations/providers";
import type { GooglePlaceSelection } from "@/lib/integrations/types";
import type {
  IntegrationConnectionRow,
  IntegrationsData,
} from "@/lib/data/integrations";

const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  reviews_media: "Reviews & media",
  social: "Social",
  productivity: "Productivity",
};

function importSummary(reviews: number, photos: number): string {
  if (reviews + photos === 0) return "";
  return `Imported ${reviews} review${reviews === 1 ? "" : "s"} and ${photos} photo${photos === 1 ? "" : "s"}.`;
}

export function IntegrationsGrid({
  dataPromise,
}: {
  dataPromise: Promise<IntegrationsData>;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | IntegrationCategory>("all");
  const [manageOpen, setManageOpen] = useState(false);

  const tabs: ("all" | IntegrationCategory)[] = [
    "all",
    ...Array.from(new Set(INTEGRATION_PROVIDERS.map((p) => p.category))),
  ];

  const visible = INTEGRATION_PROVIDERS.filter((p) => {
    if (tab !== "all" && p.category !== tab) return false;
    const q = query.trim().toLowerCase();
    if (q && !p.displayName.toLowerCase().includes(q) && !p.tagline.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 lg:space-y-[1.389vw]">
      {/* Search (left) + tabs (right) — all static */}
      <div className="flex flex-col gap-3 lg:gap-[0.833vw] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-64 lg:w-[18vw]">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="pl-9 lg:pl-[2.5vw]"
          />
        </div>
        <div className="flex flex-wrap gap-1 lg:gap-[0.278vw]">
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  "rounded-md lg:rounded-[0.417vw] px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-sm lg:text-[0.903vw] font-medium transition-colors " +
                  (active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")
                }
              >
                {t === "all" ? "All integrations" : CATEGORY_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid — built from the static constant, paints instantly */}
      {visible.length === 0 ? (
        <EmptyState size="sm" icon="search" title="No integrations match your search" />
      ) : (
        <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((provider) => {
            const isGoogle = provider.slug === GOOGLE_PLACES_PROVIDER;
            const comingSoon = provider.status === "coming_soon";

            return (
              <div
                key={provider.slug}
                className="flex flex-col rounded-md lg:rounded-[0.6vw] border border-border bg-card p-5 lg:p-[1.389vw]"
              >
                <div className="flex items-start gap-3 lg:gap-[0.833vw]">
                  <span className="flex shrink-0 items-center justify-center">
                    {provider.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- brand logo
                      <img src={provider.logo} alt="" className="size-11 lg:size-[3vw] object-contain" />
                    ) : (
                      <Icon name={provider.icon} className="size-11 lg:size-[3vw] text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base lg:text-[1.111vw] font-semibold leading-tight text-foreground">
                      {provider.displayName}
                    </h3>
                    <Link
                      href={`https://${provider.domain}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-0.5 lg:mt-[0.139vw] block truncate text-xs lg:text-[0.833vw] leading-tight text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {provider.domain}
                    </Link>
                  </div>
                </div>

                <p className="mt-3 lg:mt-[0.833vw] flex-1 text-sm lg:text-[0.903vw] leading-relaxed text-muted-foreground">
                  {provider.tagline}
                </p>

                <div className="mt-4 lg:mt-[1.111vw] flex items-center justify-between border-t border-border pt-4 lg:pt-[1.111vw]">
                  <Button
                    size="sm"
                    variant="surface"
                    disabled={comingSoon}
                    onClick={isGoogle ? () => setManageOpen(true) : undefined}
                  >
                    View integration
                  </Button>
                  {isGoogle ? (
                    <Suspense fallback={<Skeleton className="h-[18px] w-[32px] lg:h-[1.25vw] lg:w-[2.222vw] rounded-full" />}>
                      <GoogleSwitch dataPromise={dataPromise} onToggle={() => setManageOpen(true)} />
                    </Suspense>
                  ) : (
                    <Switch checked={false} disabled={comingSoon} aria-label={`${provider.displayName} integration`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Google management dialog — content streams via use() */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-lg lg:max-w-[40vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Google</DialogTitle>
            <DialogDescription>
              Search your business and pick it to import up to 5 recent reviews and your photos.
              You can connect one Google listing at a time.
            </DialogDescription>
          </DialogHeader>

          {manageOpen ? (
            <Suspense fallback={<DialogLoading />}>
              <GoogleManage dataPromise={dataPromise} />
            </Suspense>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleSwitch({
  dataPromise,
  onToggle,
}: {
  dataPromise: Promise<IntegrationsData>;
  onToggle: () => void;
}) {
  const { connections } = use(dataPromise);
  const connected = connections.some((c) => c.provider === GOOGLE_PLACES_PROVIDER);
  return (
    <Switch checked={connected} aria-label="Google integration" onCheckedChange={onToggle} />
  );
}

function DialogLoading() {
  return (
    <div className="space-y-3 lg:space-y-[0.833vw]">
      <Skeleton className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw]" />
      <Skeleton className="h-20 lg:h-[5.5vw] w-full rounded-xl lg:rounded-[0.833vw]" />
    </div>
  );
}

function GoogleManage({ dataPromise }: { dataPromise: Promise<IntegrationsData> }) {
  const { connections, canManage } = use(dataPromise);
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // The listing pending disconnect — drives a styled confirm dialog (no native confirm()).
  const [confirmTarget, setConfirmTarget] = useState<IntegrationConnectionRow | null>(null);

  const googleConnections = connections.filter((c) => c.provider === GOOGLE_PLACES_PROVIDER);
  // Only ONE Google listing may be connected at a time. To switch, the existing
  // one must be removed first — so the picker hides once a listing is connected.
  const atLimit = googleConnections.length >= 1;

  async function handleConnect(sel: GooglePlaceSelection) {
    setConnecting(true);
    try {
      const content = await fetchPlaceContent(sel.placeId);
      const res = await connectGooglePlace({ selection: sel, content });
      if (!res.success) {
        showToast(res.error, { type: "error" });
        return;
      }
      const { reviewCount, mediaCount } = res.data!;
      const summary = importSummary(reviewCount, mediaCount);
      showToast(
        summary || `Connected ${sel.name}. Google returned no reviews or photos for this listing yet.`,
        { type: summary ? "success" : "info" },
      );
      router.refresh();
    } catch (err) {
      console.error("[integrations] connect failed", err);
      showToast("Could not connect that listing. Try again.", { type: "error" });
    } finally {
      setConnecting(false);
    }
  }

  async function handleRefresh(conn: IntegrationConnectionRow) {
    setBusyId(conn.id);
    try {
      const content = await fetchPlaceContent(conn.externalAccountId);
      const res = await refreshGooglePlace(conn.id, content);
      if (!res.success) {
        showToast(res.error, { type: "error" });
        return;
      }
      const { reviewCount, mediaCount } = res.data!;
      showToast(importSummary(reviewCount, mediaCount) || "Refreshed. No reviews or photos available yet.", {
        type: reviewCount + mediaCount > 0 ? "success" : "info",
      });
      router.refresh();
    } catch (err) {
      console.error("[integrations] refresh failed", err);
      showToast("Could not refresh right now. Try again.", { type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDisconnect() {
    const conn = confirmTarget;
    if (!conn) return;
    setBusyId(conn.id);
    const res = await disconnectGooglePlace(conn.id);
    if (!res.success) {
      showToast(res.error, { type: "error" });
      setBusyId(null);
      setConfirmTarget(null);
      return;
    }
    showToast("Disconnected.", { type: "success" });
    setConfirmTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {canManage ? (
        atLimit ? (
          <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
            You can connect one Google listing at a time. Remove the current one below to connect a
            different business.
          </p>
        ) : (
          <div className="space-y-1.5 lg:space-y-[0.417vw]">
            <GoogleBusinessPicker onSelect={handleConnect} disabled={connecting} />
            {connecting ? (
              <p className="text-xs lg:text-[0.764vw] text-muted-foreground">Connecting your listing…</p>
            ) : null}
          </div>
        )
      ) : (
        <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
          Only owners and admins can connect accounts.
        </p>
      )}

      {googleConnections.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl lg:rounded-[0.833vw] border border-border">
          {googleConnections.map((conn) => {
            const address =
              typeof conn.meta.formattedAddress === "string" ? conn.meta.formattedAddress : null;
            const rowBusy = busyId === conn.id;
            return (
              <li
                key={conn.id}
                className="flex flex-wrap items-center justify-between gap-3 lg:gap-[0.833vw] p-4 lg:p-[1.111vw]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm lg:text-[0.972vw] font-semibold text-foreground">
                    {conn.label ?? "Google listing"}
                  </p>
                  {address ? (
                    <p className="truncate text-xs lg:text-[0.833vw] text-muted-foreground">{address}</p>
                  ) : null}
                  <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                    {conn.reviewCount} review{conn.reviewCount === 1 ? "" : "s"} · {conn.mediaCount} photo
                    {conn.mediaCount === 1 ? "" : "s"}
                    {conn.lastSyncedAt ? ` · synced ${formatDate(conn.lastSyncedAt)}` : ""}
                  </p>
                  {conn.lastError ? (
                    <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.764vw] text-destructive">{conn.lastError}</p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-2 lg:gap-[0.556vw]">
                    <Button size="sm" variant="outline" onClick={() => handleRefresh(conn)} disabled={rowBusy || connecting}>
                      <Icon name="swap" className="size-4 lg:size-[1.111vw]" />
                      {rowBusy ? "Working…" : "Refresh"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmTarget(conn)} disabled={rowBusy || connecting}>
                      Disconnect
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : canManage ? (
        <EmptyState
          size="sm"
          icon="star"
          title="No Google listing connected yet"
          description="Connect your Google business to show your reviews and work photos on your Hommy profile."
        />
      ) : null}

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {confirmTarget?.label ?? "this listing"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its imported reviews and photos will be removed from your profile. You can reconnect a
              Google listing anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busyId !== null}
              onClick={(e) => {
                e.preventDefault();
                void confirmDisconnect();
              }}
            >
              {busyId !== null ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
