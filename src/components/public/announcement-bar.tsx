"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { joinWaitlist } from "@/lib/actions/waitlist";

const DISMISS_KEY = "hommy:dev-banner";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pre-launch notice. A dismissible bar pinned to the bottom of the public site
 * (bottom, not top, so it never fights the absolute/transparent SiteHeader) that
 * tells visitors Hommy is in early access, with a "Join waitlist" button that
 * opens a small email capture reusing the existing `joinWaitlist` action.
 * Starts hidden and reveals after mount, so a previously-dismissed visitor never
 * sees a flash and there's no SSR/hydration mismatch.
 */
export function AnnouncementBar() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after reading the dismissed flag from localStorage on mount
    if (!dismissed) setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage blocked — just hide for this session */
    }
  }

  function submit() {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
      setError("Enter a valid email");
      return;
    }
    start(async () => {
      const res = await joinWaitlist({ email: e });
      if (!res.success) {
        setError(res.fieldErrors?.email ?? res.error);
        return;
      }
      setJoined(true);
      showToast("You're on the list — we'll email you at launch.", { type: "success" });
    });
  }

  return (
    <>
      {show ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 lg:pb-[0.833vw]">
          <div className="gradient-frame-animated [--gf-fill:var(--background)] [--gf-width:1.5px] pointer-events-auto flex w-full max-w-2xl lg:max-w-[50vw] items-center gap-3 lg:gap-[0.833vw] rounded-xl lg:rounded-[0.833vw] px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] shadow-2xl">
            <Icon name="logo" className="hidden shrink-0 text-primary sm:block size-4 lg:size-[1.3vw]" />
            <p className="min-w-0 flex-1 text-[13px] leading-snug lg:text-[1vw]">
              <span className="font-semibold">Hommy is in early access.</span>{" "}
              <span className="">Still building — full launch in about a month.</span>
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-[13px] font-semibold text-background transition-colors hover:bg-foreground/90 lg:rounded-[0.4vw] lg:px-[0.833vw] lg:py-[0.417vw] lg:text-[0.85vw]"
            >
              Join waitlist
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-background/10 lg:size-[1.9vw]"
            >
              <Icon name="close" className="size-4 lg:size-[1.1vw]" />
            </button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setError("");
        }}
      >
        <DialogContent className="sm:max-w-md lg:max-w-[30vw]">
          <DialogHeader>
            <DialogTitle>Join the waitlist</DialogTitle>
            <DialogDescription>
              We&apos;re launching fully in about a month. Drop your email and we&apos;ll let you know the moment we go live.
            </DialogDescription>
          </DialogHeader>

          {joined ? (
            <div className="flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success lg:gap-[0.556vw] lg:p-[0.833vw] lg:text-[0.9vw]">
              <Icon name="tick-square" className="size-5 shrink-0 lg:size-[1.2vw]" />
              You&apos;re on the list — we&apos;ll email you at launch.
            </div>
          ) : (
            <div className="space-y-1.5 lg:space-y-[0.417vw]">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                aria-invalid={!!error}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              {error ? <p className="text-xs text-destructive lg:text-[0.78vw]">{error}</p> : null}
            </div>
          )}

          <DialogFooter>
            {joined ? (
              <Button onClick={() => setOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={pending} className="font-semibold">
                  {pending ? "Joining…" : "Join waitlist"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
