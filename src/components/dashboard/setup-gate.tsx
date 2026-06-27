"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ContractorSetupForm } from "@/components/contractor-setup/contractor-setup-form";
import type { ContractorSetupState, SetupInitial } from "@/lib/contractor/setup";

/**
 * Dashboard setup surface. Behaviour depends on where the contractor is:
 *  - needs_info  → a blocking modal (the full setup form) they can't dismiss,
 *    because without the basics they can't be matched. Verification stays
 *    skippable inside it.
 *  - needs_docs / rejected → a quiet card that opens a docs-only dialog on click.
 *    No auto-opening dialog.
 */
export function SetupGate({
  state,
  availableSubtypes,
  initial,
}: {
  state: ContractorSetupState;
  availableSubtypes: string[];
  initial: SetupInitial;
}) {
  const router = useRouter();
  const [docsOpen, setDocsOpen] = useState(false);

  function done() {
    setDocsOpen(false);
    router.refresh();
  }

  if (state === "needs_info") {
    return (
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="flex max-h-[90dvh] flex-col gap-0 overflow-y-auto sm:max-w-[600px] lg:max-w-[42vw]"
        >
          <DialogHeader className="pb-5 lg:pb-[1.389vw]">
            <DialogTitle>Finish setting up your profile</DialogTitle>
            <DialogDescription>
              Just a few details so we can match you with the right jobs. It takes
              about two minutes.
            </DialogDescription>
          </DialogHeader>
          <ContractorSetupForm
            mode="full"
            availableSubtypes={availableSubtypes}
            initial={initial}
            onComplete={done}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (state === "needs_docs" || state === "rejected") {
    const rejected = state === "rejected";
    return (
      <>
        <section className="gradient-frame-animated [--gf-fill:var(--accent)] [--gf-width:1.5px] flex flex-wrap items-center justify-between gap-4 lg:gap-[1.111vw] rounded-md lg:rounded-[0.6vw] p-5 lg:p-[1.389vw]">
          <div className="flex flex-col md:flex-row items-start gap-3 lg:gap-[0.833vw]">
            <span className="flex size-10 lg:size-[2.778vw] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="shield-done" className="size-5 lg:size-[1.389vw]" />
            </span>
            <div>
              <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
                {rejected ? "Verification needs another look" : "Get verified to win jobs"}
              </h2>
              <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-foreground/60">
                {rejected
                  ? "Upload current license and insurance documents and we'll review again."
                  : "Add your license and insurance. Verified roofers win more work. Takes about a minute."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={() => setDocsOpen(true)}
            className="shrink-0 font-semibold"
          >
            Upload documents
          </Button>
        </section>

        <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
          <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-y-auto sm:max-w-[560px] lg:max-w-[38vw]">
            <DialogHeader className="pb-5 lg:pb-[1.389vw]">
              <DialogTitle>Verify your business</DialogTitle>
              <DialogDescription>
                Upload your license and insurance. We review them within a day.
              </DialogDescription>
            </DialogHeader>
            <ContractorSetupForm
              mode="documents"
              availableSubtypes={availableSubtypes}
              initial={initial}
              rejected={rejected}
              onComplete={done}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}
