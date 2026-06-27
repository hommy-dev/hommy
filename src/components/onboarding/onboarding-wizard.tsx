"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ContractorSetupForm,
  Stepper,
  FULL_STEP_LABELS,
} from "@/components/contractor-setup/contractor-setup-form";
import type { SetupInitial } from "@/lib/contractor/setup";

export function OnboardingWizard({
  availableSubtypes,
  initial,
}: {
  availableSubtypes: string[];
  initial: SetupInitial;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  return (
    <div className="flex h-svh flex-col overflow-hidden lg:bg-canvas text-foreground pt-10 lg:pt-[1.2vw] pb-8 lg:pb-[2vw]">
      <header className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] shrink-0 items-center justify-center px-6 lg:px-[1.667vw] py-5 lg:py-[1.389vw]">
        <Stepper labels={FULL_STEP_LABELS} current={step} />
      </header>

      <main className="mx-auto bg-background flex min-h-0 w-full max-w-2xl lg:max-w-[45vw] flex-1 flex-col overflow-y-auto px-6 lg:px-[2vw] py-10 lg:py-[2vw] rounded-lg lg:rounded-[0.61vw]">
        <ContractorSetupForm
          mode="full"
          availableSubtypes={availableSubtypes}
          initial={initial}
          showStepper={false}
          onStepChange={setStep}
          onComplete={() => {
            router.push("/contractor");
            router.refresh();
          }}
        />
      </main>
    </div>
  );
}
