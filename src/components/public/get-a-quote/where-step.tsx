"use client";

import {
  GooglePlacesInput,
  type PlaceResult,
} from "@/components/ui/google-places-input";
import { IdentityCard } from "@/components/ui/identity-card";
import { WizardField, WizardStep } from "./wizard-parts";
import { SVGIcon } from "@/components/ui/svg-icon";

export function WhereStep({
  value,
  error,
  onPlaceSelect,
  summary,
  postingAsName,
}: {
  value: string;
  error?: string;
  onPlaceSelect: (place: PlaceResult) => void;
  /** City, state, ZIP of the chosen place, or null. */
  summary: string | null;
  /** Shown when a signed-in homeowner is posting on the final step. */
  postingAsName: string | null;
}) {
  return (
    <WizardStep
      title="Where's the property?"
      sub="We match you with roofers who cover this address."
    >
      <WizardField label="Property address" error={error}>
        <GooglePlacesInput
          mode="address"
          placeholder="Start typing your address…"
          value={value}
          onPlaceSelect={onPlaceSelect}
          aria-invalid={!!error}
          className="h-11 lg:h-[3.056vw] bg-card text-left"
        />
      </WizardField>

      {summary && (
        <div className="-mt-4 lg:-mt-[1.2vw] flex items-center gap-2.5 lg:gap-[0.694vw]">
          <SVGIcon
            src="/icons/location.svg"
            className="size-5 lg:size-[1.389vw] opacity-80 shrink-0"
          />
          <p className="text-left text-[13px] lg:text-[0.903vw] text-pretty text-muted-foreground font-medium">
            {summary}
          </p>
        </div>
      )}

      {postingAsName && (
        <WizardField label="Posting as">
          <IdentityCard name={postingAsName} tone="muted" className="w-full" />
        </WizardField>
      )}
    </WizardStep>
  );
}
