"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  CREDIT_PACKS,
  MIN_CUSTOM_CREDITS,
  MAX_CUSTOM_CREDITS,
  priceCentsForCredits,
  formatCents,
} from "@/lib/billing/packs";
import { requestCreditPurchase } from "@/lib/actions/billing";

/**
 * Buy-credits flow. v1 has NO live payment: the picker is real, but "Continue"
 * records a purchase intent + pings the team, then shows a "payments coming
 * soon" confirmation. When a provider is wired, only the submit handler changes.
 */
export function BuyCreditsDialog({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState<number>(100);
  const [custom, setCustom] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const amountCents = priceCentsForCredits(credits);
  const valid = credits >= MIN_CUSTOM_CREDITS && credits <= MAX_CUSTOM_CREDITS;

  function reset() {
    setDone(false);
    setCustom(false);
    setCredits(100);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTimeout(reset, 200);
  }

  function submit() {
    if (!valid || pending) return;
    start(async () => {
      const res = await requestCreditPurchase(credits);
      if (res.ok) setDone(true);
      else showToast(res.message, { type: "error" });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>Buy credits</Button>
      </DialogTrigger>

      <DialogContent className="max-w-md lg:max-w-[30vw]">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 lg:gap-[0.556vw]">
                <Icon name="tick-square" className="size-5 lg:size-[1.389vw] text-success" />
                Request received
              </DialogTitle>
              <DialogDescription>
                Card payments aren&apos;t live on Homei just yet. We&apos;ve logged your request for{" "}
                <strong>{credits} credits</strong> ({formatCents(amountCents)}) and pinged the team — we&apos;ll
                reach out shortly to get you topped up.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Got it</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Buy credits</DialogTitle>
              <DialogDescription>
                Credits unlock chats with leads and cover the win fee when you land a job. 1 credit = $1.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2.5 lg:gap-[0.694vw]">
              {CREDIT_PACKS.map((p) => {
                const active = !custom && credits === p.credits;
                return (
                  <button
                    key={p.credits}
                    type="button"
                    onClick={() => {
                      setCustom(false);
                      setCredits(p.credits);
                    }}
                    className={cn(
                      "relative flex flex-col items-start rounded-lg lg:rounded-[0.694vw] border p-3 lg:p-[0.833vw] text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                    )}
                  >
                    {p.badge ? (
                      <span className="absolute right-2 lg:right-[0.556vw] top-2 lg:top-[0.556vw] rounded-full bg-primary/10 px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-[10px] lg:text-[0.694vw] font-semibold text-primary">
                        {p.badge}
                      </span>
                    ) : null}
                    <span className="text-lg lg:text-[1.25vw] font-semibold tabular-nums">{p.credits}</span>
                    <span className="text-xs lg:text-[0.833vw] text-muted-foreground">credits</span>
                    <span className="mt-1.5 lg:mt-[0.417vw] text-sm lg:text-[0.903vw] font-medium">
                      {formatCents(p.cents)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 lg:space-y-[0.417vw]">
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={cn(
                  "text-xs lg:text-[0.833vw] font-medium transition-colors",
                  custom ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Or enter a custom amount
              </button>
              {custom ? (
                <input
                  type="number"
                  min={MIN_CUSTOM_CREDITS}
                  max={MAX_CUSTOM_CREDITS}
                  value={Number.isFinite(credits) ? credits : ""}
                  onChange={(e) => setCredits(Math.floor(Number(e.target.value)))}
                  placeholder={`${MIN_CUSTOM_CREDITS}–${MAX_CUSTOM_CREDITS} credits`}
                  className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
                />
              ) : null}
            </div>

            <DialogFooter className="items-center justify-between gap-3 lg:gap-[0.833vw] sm:justify-between">
              <span className="text-sm lg:text-[0.972vw] text-muted-foreground">
                Total <strong className="text-foreground">{valid ? formatCents(amountCents) : "—"}</strong>
              </span>
              <Button onClick={submit} disabled={!valid || pending}>
                {pending ? "Submitting…" : "Continue to payment"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
