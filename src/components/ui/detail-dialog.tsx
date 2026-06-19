"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * A roomy centered dialog for detail views (job / request). Desktop: large,
 * capped-height with the body scrolling internally; the header + optional footer
 * stay pinned. Mobile: full-screen, the whole body scrolls. Use instead of a
 * side Sheet when there's a lot of info to read.
 */
export function DetailDialog({
  open,
  onOpenChange,
  title,
  headerExtra,
  footer,
  children,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Rendered under the title (e.g. a status pill + service name). */
  headerExtra?: React.ReactNode;
  /** Pinned actions at the bottom (e.g. Engage / Open chat). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          // No fixed description — the body is free-form.
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-popover text-popover-foreground outline-none ring-1 ring-foreground/5 duration-100",
            // Mobile: full-screen, scrollable.
            "inset-0 h-[100dvh] w-screen max-w-none rounded-none",
            // Desktop (sm+): centered, large, capped height (body scrolls).
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[88vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg lg:sm:max-w-[46vw]",
            "data-open:animate-in data-open:fade-in-0 sm:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 sm:data-closed:zoom-out-95",
            contentClassName,
          )}
        >
          {/* Header (pinned) */}
          <div className="flex shrink-0 items-start gap-3 lg:gap-[0.833vw] border-b border-border px-5 lg:px-[1.667vw] py-4 lg:py-[1.111vw]">
            <div className="min-w-0 flex-1 space-y-1.5 lg:space-y-[0.417vw]">
              <DialogPrimitive.Title className="font-sebenta text-xl lg:text-[1.444vw] leading-tight font-semibold">
                {title}
              </DialogPrimitive.Title>
              {headerExtra}
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-1 shrink-0 text-muted-foreground hover:text-foreground focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                aria-label="Close"
              >
                <Icon name="close" className="size-4 lg:size-[1.111vw]" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Body (scrolls) */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 lg:px-[1.667vw] py-5 lg:py-[1.389vw]">
            {children}
          </div>

          {/* Footer (pinned, optional) */}
          {footer ? (
            <div className="shrink-0 border-t border-border px-5 lg:px-[1.667vw] py-3.5 lg:py-[0.972vw]">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
