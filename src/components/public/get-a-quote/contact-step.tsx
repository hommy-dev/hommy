"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdentityCard } from "@/components/ui/identity-card";
import { WizardField, WizardStep } from "./wizard-parts";
import type { FieldErrors } from "./constants";
import { Loading } from "@/components/ui/loading";

export function ContactStep({
  signedIn,
  fullName,
  email,
  phone,
  onFullNameChange,
  onEmailChange,
  onPhoneChange,
  errors,
  emailChecking,
  emailIsHomeowner,
  emailIsOther,
  onOpenLogin,
}: {
  signedIn: boolean;
  fullName: string;
  email: string;
  phone: string;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  errors: FieldErrors;
  emailChecking: boolean;
  emailIsHomeowner: boolean;
  emailIsOther: boolean;
  onOpenLogin: () => void;
}) {
  if (signedIn) {
    return (
      <WizardStep
        title="You're all set"
        sub="You're signed in — review your details and post your job."
      >
        <IdentityCard
          eyebrow="Signed in"
          name={fullName || "Your account"}
          secondary={email}
        />
      </WizardStep>
    );
  }

  return (
    <WizardStep
      title="Where should roofers reach you?"
      sub="We create your free account so you can compare quotes and message contractors."
    >
      <WizardField label="Full name" error={errors.fullName}>
        <Input
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Jordan Smith"
          className="h-11 lg:h-[3.056vw] bg-card"
          aria-invalid={!!errors.fullName}
          autoFocus
        />
      </WizardField>

      <WizardField label="Email" error={errors.email}>
        <Input
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          type="email"
          inputMode="email"
          placeholder="you@email.com"
          className="h-11 lg:h-[3.056vw] bg-card text-left"
          aria-invalid={!!errors.email || emailIsHomeowner || emailIsOther}
        />
        {emailChecking && (
          <div className="flex items-center gap-2 lg:gap-[0.694vw]">
            <p className="lg:text-[1vw] text-muted-foreground text-left font-medium">
              Checking...
            </p>
            <Loading fill className="size-4 lg:size-[1.2vw] text-primary" />
          </div>
        )}
      </WizardField>

      <WizardField label="Phone" error={errors.phone}>
        <Input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          type="tel"
          inputMode="tel"
          placeholder="(214) 555-0100"
          className="h-11 lg:h-[3.056vw] bg-card text-left"
          aria-invalid={!!errors.phone}
        />
      </WizardField>

      {emailIsHomeowner && (
        <div className="flex flex-col items-center justify-center gap-3 lg:gap-[0.833vw] rounded-md lg:rounded-[0.556vw] border border-border bg-muted/50 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium">
          <p className="text-[13px] lg:text-[1vw] text-muted-foreground">
            Looks like you already have an account.
            <br /> Please sign in to post under it.
          </p>
          <Button
            type="button"
            onClick={onOpenLogin}
            className="px-8 lg:px-[2vw]"
          >
            Log in
          </Button>
        </div>
      )}

      {emailIsOther && (
        <div className="rounded-md lg:rounded-[0.556vw] border border-destructive/30 bg-destructive/5 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium">
          <p className="text-[13px] lg:text-[1vw] text-destructive">
            This email is registered as a contractor account.
            <br /> Use a different email to post your job as a homeowner.
          </p>
        </div>
      )}
    </WizardStep>
  );
}
