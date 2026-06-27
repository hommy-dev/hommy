"use client";

// The cookie consent UI: a non-blocking card pinned to the bottom-right shown
// until the visitor decides, plus a "Manage" dialog (also opened from the
// footer's "Cookie settings" link) to toggle categories. Analytics stays off
// until accepted — see consent-context.tsx + posthog-provider.tsx.

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConsent } from "./consent-context";

export function CookieConsent() {
  const { ready, prefs, settingsOpen, acceptAll, rejectAll, save, openSettings, closeSettings } =
    useConsent();

  const showBanner = ready && prefs === null && !settingsOpen;

  return (
    <>
      {showBanner ? (
        <div className="pointer-events-none fixed bottom-0 right-0 z-50 p-3 lg:p-[1.111vw]">
          <div className="pointer-events-auto flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-2xl lg:max-w-[23vw] lg:gap-[0.833vw] lg:rounded-[0.833vw] lg:p-[1.111vw]">
            <p className="text-[13px] leading-snug text-foreground/80 lg:text-[0.9vw]">
              We use essential cookies to run the site and, with your permission,
              analytics cookies to understand usage and improve Hommy. See our{" "}
              <Link href="/privacy" className="font-medium text-foreground underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex items-center justify-end gap-2 lg:gap-[0.556vw]">
              <Button variant="ghost" size="sm" onClick={openSettings}>
                Manage
              </Button>
              <Button variant="outline" size="sm" onClick={rejectAll}>
                Reject
              </Button>
              <Button size="sm" onClick={acceptAll} className="font-semibold">
                Accept all
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={settingsOpen} onOpenChange={(o) => (o ? openSettings() : closeSettings())}>
        <DialogContent className="sm:max-w-md lg:max-w-[32vw]">
          <DialogHeader>
            <DialogTitle>Cookie settings</DialogTitle>
            <DialogDescription>
              Choose which cookies Hommy may use. You can change this anytime from the footer.
            </DialogDescription>
          </DialogHeader>

          {settingsOpen ? (
            <SettingsForm
              initialAnalytics={prefs?.analytics ?? true}
              onSave={(analytics) => save({ analytics })}
              onCancel={closeSettings}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettingsForm({
  initialAnalytics,
  onSave,
  onCancel,
}: {
  initialAnalytics: boolean;
  onSave: (analytics: boolean) => void;
  onCancel: () => void;
}) {
  const [analytics, setAnalytics] = useState(initialAnalytics);

  return (
    <>
      <div className="space-y-3 lg:space-y-[0.833vw]">
        <Row
          title="Necessary"
          desc="Required to run the site: sign-in, security, your session. Always on."
        >
          <Switch checked disabled aria-label="Necessary cookies (always on)" />
        </Row>
        <Row
          title="Analytics"
          desc="Helps us see how the site is used (via PostHog) so we can improve it. Off until you allow it."
        >
          <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label="Analytics cookies" />
        </Row>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(analytics)} className="font-semibold">
          Save choices
        </Button>
      </DialogFooter>
    </>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3 lg:gap-[1.111vw] lg:rounded-[0.694vw] lg:p-[0.833vw]">
      <div className="min-w-0">
        <p className="text-sm font-semibold lg:text-[0.972vw]">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground lg:mt-[0.139vw] lg:text-[0.78vw]">{desc}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}
