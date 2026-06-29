"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createLead, requestDirectQuote } from "@/lib/actions/leads";
import {
  checkEmailRegistered,
  startHomeownerGoogleSignup,
} from "@/lib/actions/auth";
import { type PlaceResult } from "@/components/ui/google-places-input";
import { type StagedFile } from "@/components/ui/local-file-picker";
import { uploadToCloudinary } from "@/lib/cloudinary/upload";
import { showToast } from "@/components/ui/toast";
import { NOT_SURE_SUBTYPE } from "@/lib/leads/subtype";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  EMAIL_RE,
  type StepKey,
  type FieldErrors,
} from "./get-a-quote/constants";
import { WhatStep } from "./get-a-quote/what-step";
import { WhereStep } from "./get-a-quote/where-step";
import { ContactStep } from "./get-a-quote/contact-step";
import { LoginDialog, type HomeownerContact } from "./get-a-quote/login-dialog";
import { Icon } from "../ui/icon";

// Where we stash the in-progress job before a Google round-trip, so it can be
// restored when the now-signed-in homeowner lands back on the wizard.
const DRAFT_KEY = "hommy:get-a-quote:draft";

export function GetAQuoteWizard({
  subtypes,
  initialSubtype,
  initialWhere,
  isLoggedInHomeowner,
  loggedInName,
  target = null,
}: {
  subtypes: string[];
  initialSubtype: string;
  initialWhere: string;
  isLoggedInHomeowner: boolean;
  loggedInName: string | null;
  /** Direct hire: when set, the request goes to this one contractor (not broadcast). */
  target?: { slug: string; name: string; logoUrl: string | null } | null;
}) {
  const router = useRouter();
  const [pending, startSubmit] = useTransition();
  const [googlePending, startGoogle] = useTransition();

  // Guests fill all three steps; logged-in homeowners skip the contact step.
  const stepKeys: StepKey[] = isLoggedInHomeowner
    ? ["what", "where"]
    : ["what", "where", "you"];
  const total = stepKeys.length;

  // A subtype carried from the homepage teaser lets us open straight at "where".
  const [stepIndex, setStepIndex] = useState(initialSubtype ? 1 : 0);
  const current = stepKeys[Math.min(stepIndex, total - 1)];

  // Multiple subtypes allowed; "Not sure" is exclusive (clears the rest).
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>(
    initialSubtype ? [initialSubtype] : []
  );
  const [urgency, setUrgency] = useState<string>("within_month");
  const [notes, setNotes] = useState("");
  // Photos are staged LOCALLY and only uploaded to Cloudinary on submit — keeps
  // the picker instant and avoids burning storage on photos the user removes.
  const [photos, setPhotos] = useState<StagedFile[]>([]);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Inline existing-account flow. A single account is one role (see
  // docs/HOMMY_PLATFORM.md §5): a known homeowner is prompted to sign in inline;
  // a contractor/admin email is blocked with a "use a different email" note.
  // `emailStatus` also keeps Post disabled WHILE we're checking, so the button
  // never flips enabled → disabled once the result lands.
  //  - "free"      → no account, OK to post as a guest
  //  - "homeowner" → existing homeowner, offer inline sign-in
  //  - "other"     → contractor/admin email, can't post under it
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "checking" | "free" | "homeowner" | "other"
  >("idle");
  const [signedIn, setSignedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // If a homeowner signed in via Google mid-flow, they return here already
  // authenticated — restore the job they'd started and drop them on the last
  // step to review and post.
  useEffect(() => {
    if (!isLoggedInHomeowner) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        selectedSubtypes?: string[];
        urgency?: string;
        notes?: string;
        place?: PlaceResult | null;
      };
      if (Array.isArray(d.selectedSubtypes))
        setSelectedSubtypes(d.selectedSubtypes);
      if (typeof d.urgency === "string") setUrgency(d.urgency);
      if (typeof d.notes === "string") setNotes(d.notes);
      // Photos are local File objects, which can't survive the Google redirect's
      // sessionStorage round-trip — the homeowner re-adds them if they used Google.
      if (d.place) setPlace(d.place);
      setStepIndex(stepKeys.length - 1);
    } catch {
      // Corrupt/blocked storage — just start fresh.
    } finally {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emailValid = EMAIL_RE.test(email.trim());
  const emailChecking = emailStatus === "checking";
  const emailIsHomeowner = emailStatus === "homeowner";
  const emailIsOther = emailStatus === "other";

  // Debounced background check: is this email already registered, and as what?
  useEffect(() => {
    if (signedIn) return;
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setEmailStatus("idle");
      return;
    }
    let cancelled = false;
    setEmailStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await checkEmailRegistered(value);
        if (cancelled) return;
        if (!res.exists) setEmailStatus("free");
        else if (res.role === "homeowner") setEmailStatus("homeowner");
        else setEmailStatus("other");
      } catch {
        // Network/transient failure — don't block; the submit-time guard catches
        // a genuinely-taken email.
        if (!cancelled) setEmailStatus("free");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [email, signedIn]);

  const canAdvance =
    (current === "what" && selectedSubtypes.length > 0) ||
    (current === "where" && place !== null) ||
    (current === "you" &&
      (signedIn ||
        (fullName.trim().length >= 2 && emailValid && emailStatus === "free")));

  function clearError(key: string) {
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  }

  // Toggle a subtype chip. "Not sure" is mutually exclusive with the specifics.
  function toggleSubtype(s: string) {
    setSelectedSubtypes((prev) => {
      if (s === NOT_SURE_SUBTYPE) {
        return prev.includes(NOT_SURE_SUBTYPE) ? [] : [NOT_SURE_SUBTYPE];
      }
      const withoutUnsure = prev.filter((v) => v !== NOT_SURE_SUBTYPE);
      return withoutUnsure.includes(s)
        ? withoutUnsure.filter((v) => v !== s)
        : [...withoutUnsure, s];
    });
  }

  function stepOfField(field: string): number {
    if (field === "fullName" || field === "email" || field === "phone")
      return stepKeys.indexOf("you");
    if (field === "subtypes" || field === "urgency" || field === "notes")
      return stepKeys.indexOf("what");
    return stepKeys.indexOf("where");
  }

  function submit() {
    startSubmit(async () => {
      // Upload the staged photos now (on post), not when they were picked.
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        try {
          photoUrls = await Promise.all(
            photos.map((p) =>
              uploadToCloudinary(p.file, "jobs").then((r) => r.secureUrl)
            )
          );
        } catch (err) {
          console.error("[get-a-quote] photo upload failed", err);
          showToast("We couldn't upload your photos. Please try again.", {
            type: "error",
          });
          return;
        }
      }

      const base = {
        subtypes: selectedSubtypes,
        urgency,
        notes: notes.trim(),
        photos: photoUrls,
        address: place?.formattedAddress ?? "",
        city: place?.city ?? "",
        state: place?.state ?? "",
        zipCode: place?.zipCode ?? "",
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        smsOptIn,
        ...(isLoggedInHomeowner || signedIn ? {} : { fullName, email, phone }),
      };

      // Direct hire goes to one chosen contractor and lands in a 1:1 chat;
      // otherwise it broadcasts. Both return the same ActionResult shape.
      const res = target
        ? await requestDirectQuote({
            ...base,
            targetContractorSlug: target.slug,
          })
        : await createLead(base);

      if (!res.success) {
        // Email already belongs to an account — don't dead-end. Drop the user on
        // the contact step and resolve the role so we show the right prompt:
        // homeowner → sign-in popup; contractor/admin → use a different email.
        const emailInUse =
          /already|registered|sign in/i.test(res.fieldErrors?.email ?? "") ||
          /already have an account/i.test(res.error);
        if (emailInUse) {
          setStepIndex(stepKeys.indexOf("you"));
          try {
            const chk = await checkEmailRegistered(email.trim().toLowerCase());
            if (chk.exists && chk.role !== "homeowner") {
              setEmailStatus("other");
            } else {
              setEmailStatus("homeowner");
              setLoginOpen(true);
            }
          } catch {
            setEmailStatus("homeowner");
            setLoginOpen(true);
          }
          return;
        }
        showToast(res.error, { type: "error" });
        if (res.fieldErrors) {
          setErrors(res.fieldErrors);
          const idxs = Object.keys(res.fieldErrors)
            .map(stepOfField)
            .filter((i) => i >= 0);
          if (idxs.length) setStepIndex(Math.min(...idxs));
        }
        return;
      }
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      // Honest no-coverage signal: a broadcast that matched zero roofers. The
      // job is saved and the recruitment engine will work the area; tell them now.
      if (
        !target &&
        "matchedCount" in res.data &&
        res.data.matchedCount === 0
      ) {
        showToast(
          "Your job is posted. No roofers cover your area yet — we'll email you the moment one's available.",
          { type: "info", duration: 7000 }
        );
      }
      router.push(res.data.redirectTo);
      router.refresh();
    });
  }

  function next() {
    if (!canAdvance || pending) return;
    if (stepIndex < total - 1) {
      setStepIndex((s) => s + 1);
      return;
    }
    submit();
  }

  // Called when the inline login popup signs the homeowner in. We auto-fill the
  // contact fields and drop the existing-account prompt; the next Post posts
  // under their authenticated session.
  function onSignedIn(contact: HomeownerContact) {
    setSignedIn(true);
    setEmailStatus("free");
    setLoginOpen(false);
    setFullName(contact.fullName);
    setEmail(contact.email);
    setPhone(contact.phone);
    setErrors({});
    showToast("You're signed in. Review and post your job.", {
      type: "success",
    });
  }

  // Google sign-in leaves the page, so stash the in-progress job first; the
  // mount effect above restores it when they return authenticated.
  function onGoogle() {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ selectedSubtypes, urgency, notes, place })
      );
    } catch {}
    startGoogle(async () => {
      const res = await startHomeownerGoogleSignup("/get-a-quote");
      if (!res.success || !res.data) {
        showToast(res.success ? "Could not start Google sign-in." : res.error, {
          type: "error",
        });
        return;
      }
      window.location.href = res.data.url;
    });
  }

  const lastStep = stepIndex === total - 1;

  return (
    <div className="flex min-h-svh flex-col bg-canvas text-foreground pt-6 lg:pt-[1.2vw]">
      <header className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] items-center justify-center px-6 lg:px-[1.667vw] py-5 lg:py-[1.389vw]">
        <Link
          href="/"
          className="text-primary"
        >
          <Icon name="logo" className="size-12 lg:size-[3vw]" />
        </Link>
      </header>

      <main className="mx-auto bg-background flex w-full max-w-2xl lg:max-w-[45vw] flex-1 flex-col text-center px-6 lg:px-[1.667vw] py-10 lg:py-[2.778vw] rounded-lg lg:rounded-[1vw]">
        {target ? (
          <div className="mb-6 lg:mb-[1.667vw] flex items-center justify-center gap-2.5 lg:gap-[0.694vw] rounded-lg lg:rounded-[0.7vw] bg-muted/60 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
            {target.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary contractor logo URL
              <img
                src={target.logoUrl}
                alt={target.name}
                className="size-8 lg:size-[2.222vw] shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
              />
            ) : null}
            <span className="text-sm lg:text-[0.972vw] text-muted-foreground">
              Requesting a quote from{" "}
              <span className="font-semibold text-foreground">
                {target.name}
              </span>
            </span>
          </div>
        ) : null}

        {current === "what" && (
          <WhatStep
            subtypes={subtypes}
            selectedSubtypes={selectedSubtypes}
            onToggleSubtype={toggleSubtype}
            urgency={urgency}
            onUrgencyChange={setUrgency}
            notes={notes}
            onNotesChange={setNotes}
            photos={photos}
            onPhotosChange={setPhotos}
          />
        )}

        {current === "where" && (
          <WhereStep
            value={place ? place.formattedAddress : initialWhere}
            error={errors.zipCode || errors.address}
            onPlaceSelect={(p) => {
              setPlace(p);
              clearError("zipCode");
              clearError("address");
            }}
            summary={
              place
                ? [place.city, place.state, place.zipCode]
                    .filter(Boolean)
                    .join(", ")
                : null
            }
            postingAsName={
              isLoggedInHomeowner && loggedInName && lastStep
                ? loggedInName
                : null
            }
          />
        )}

        {current === "you" && (
          <ContactStep
            signedIn={signedIn}
            fullName={fullName}
            email={email}
            phone={phone}
            onFullNameChange={(v) => {
              setFullName(v);
              clearError("fullName");
            }}
            onEmailChange={(v) => {
              setEmail(v);
              clearError("email");
            }}
            onPhoneChange={(v) => {
              setPhone(v);
              clearError("phone");
            }}
            smsOptIn={smsOptIn}
            onSmsOptInChange={setSmsOptIn}
            errors={errors}
            emailChecking={emailChecking}
            emailIsHomeowner={emailIsHomeowner}
            emailIsOther={emailIsOther}
            onOpenLogin={() => setLoginOpen(true)}
          />
        )}
      </main>

      {lastStep ? (
        <p className="mx-auto w-full max-w-2xl lg:max-w-[46.662vw] px-6 lg:px-[1.667vw] pt-2 lg:pt-[0.556vw] text-center text-[12px] leading-relaxed text-muted-foreground lg:text-[0.78vw]">
          By posting, you agree to Hommy&apos;s{" "}
          <Link
            href="/terms"
            target="_blank"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          . Your job details are shared with the local roofers you&apos;re
          matched with so they can quote.
        </p>
      ) : null}

      <footer className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] items-center justify-between gap-3 lg:gap-[0.833vw] px-6 lg:px-[1.667vw] py-6 lg:py-[1.667vw]">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
          className={cn(
            stepIndex === 0 && "invisible",
            "bg-background hover:bg-background hover:border-foreground/50 px-7 lg:px-[2.5vw] font-semibold"
          )}
        >
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={next}
          disabled={!canAdvance || pending}
          className="px-7 lg:px-[2.5vw] font-semibold"
        >
          {!lastStep
            ? "Next"
            : pending
            ? target
              ? "Sending…"
              : "Posting…"
            : target
            ? `Send to ${target.name}`
            : "Post & see matches"}
        </Button>
      </footer>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        email={email}
        onSuccess={onSignedIn}
        onGoogle={onGoogle}
        googlePending={googlePending}
      />
    </div>
  );
}
