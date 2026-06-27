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
import type { SetupInitial } from "@/lib/contractor/setup";

/**
 * Verification documents dialog. Uses the shared ContractorSetupForm in
 * documents mode so the upload UI is identical to the dashboard's setup gate.
 */
export function EditVerificationDialog({
  initial,
  availableSubtypes,
  resubmit,
  prominent = false,
}: {
  initial: SetupInitial;
  availableSubtypes: string[];
  resubmit: boolean;
  /** Render a large primary trigger (for empty states) vs a compact one. */
  prominent?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {prominent ? (
        <Button
          type="button"
          size="lg"
          onClick={() => setOpen(true)}
          className="gap-2 lg:gap-[0.556vw] font-semibold"
        >
          <Icon name="shield-done" className="size-4 lg:size-[1.111vw]" />
          {resubmit ? "Update documents" : "Get verified"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 lg:gap-[0.556vw] font-semibold"
        >
          <Icon name="shield-done" className="size-4 lg:size-[1.111vw]" />
          {resubmit ? "Update" : "Get verified"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-y-auto sm:max-w-[560px] lg:max-w-[38vw]">
          <DialogHeader className="pb-5 lg:pb-[1.389vw]">
            <DialogTitle>
              {resubmit ? "Update your documents" : "Verify your business"}
            </DialogTitle>
            <DialogDescription>
              Upload your license and insurance. We review them within a day.
            </DialogDescription>
          </DialogHeader>
          <ContractorSetupForm
            mode="documents"
            availableSubtypes={availableSubtypes}
            initial={initial}
            rejected={resubmit}
            onComplete={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
