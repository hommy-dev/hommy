"use client";

// One setup form, three homes: the /onboarding page, the dashboard's forced
// modal (when a contractor reached the dashboard without finishing), and a
// docs-only dialog (sidebar/settings). The parent supplies the chrome (page or
// dialog); this renders the steps + footer and calls onComplete when done.
//
// mode="full"      → Company → Services → Coverage → Verify (Verify is skippable)
// mode="documents" → just the license + insurance upload

import {
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { submitVerification } from "@/lib/actions/profile";
import { uploadToCloudinary } from "@/lib/cloudinary/upload";
import { showToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { OptionCard } from "@/components/ui/option-card";
import { PhoneInput } from "@/components/reui/phone-input";
import {
  GooglePlacesInput,
  type PlaceResult,
} from "@/components/ui/google-places-input";
import {
  CoverageAreaEditor,
  type CoverageChange,
} from "@/components/dashboard/settings/coverage-area-editor";
import {
  WizardStep,
  WizardField,
} from "@/components/public/get-a-quote/wizard-parts";
import { SUBTYPE_META } from "@/components/public/get-a-quote/constants";
import { cn } from "@/lib/utils";
import type { Area, SetupInitial } from "@/lib/contractor/setup";

const DEFAULT_RADIUS_KM = 40;
const BIO_MIN = 40;

export const FULL_STEP_LABELS = ["Company", "Services", "Coverage", "Verify"];

// ---- File slot helpers (license / insurance / logo) ----
type Slot = { file: File | null; url: string | null; preview: string | null };

function slotFromUrl(url: string | null): Slot {
  return { file: null, url, preview: url };
}
function isImageUrl(u: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(u.split("?")[0]);
}
function slotKind(slot: Slot): "image" | "pdf" | "file" {
  if (slot.file) {
    if (slot.file.type.startsWith("image/")) return "image";
    if (slot.file.type === "application/pdf") return "pdf";
    return "file";
  }
  if (slot.url) {
    if (isImageUrl(slot.url)) return "image";
    if (/\.pdf(\?|$)/i.test(slot.url)) return "pdf";
    return "file";
  }
  return "file";
}
function pickInto(setSlot: Dispatch<SetStateAction<Slot>>, file: File) {
  setSlot((prev) => {
    if (prev.file && prev.preview) URL.revokeObjectURL(prev.preview);
    return { file, url: null, preview: URL.createObjectURL(file) };
  });
}
function clearSlot(setSlot: Dispatch<SetStateAction<Slot>>) {
  setSlot((prev) => {
    if (prev.file && prev.preview) URL.revokeObjectURL(prev.preview);
    return { file: null, url: null, preview: null };
  });
}
async function resolveUrl(slot: Slot, folder: "avatars" | "documents") {
  if (slot.file) return (await uploadToCloudinary(slot.file, folder)).secureUrl;
  return slot.url;
}

export function ContractorSetupForm({
  mode,
  availableSubtypes,
  initial,
  rejected = false,
  showStepper = true,
  onStepChange,
  onComplete,
}: {
  mode: "full" | "documents";
  availableSubtypes: string[];
  initial: SetupInitial;
  rejected?: boolean;
  /** Render the built-in stepper. Set false when the parent shows its own. */
  showStepper?: boolean;
  /** Fires whenever the active step changes (for an external stepper). */
  onStepChange?: (index: number) => void;
  onComplete: () => void;
}) {
  const full = mode === "full";
  const STEP_KEYS = full
    ? (["company", "services", "coverage", "verify"] as const)
    : (["verify"] as const);

  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);

  const [logo, setLogo] = useState<Slot>(() => slotFromUrl(initial.logoUrl));
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [phone, setPhone] = useState(initial.phone);
  const [years, setYears] = useState(
    initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : ""
  );
  const [bio, setBio] = useState(initial.bio);
  const [subtypes, setSubtypes] = useState<string[]>(initial.subtypes);
  const [areas, setAreas] = useState<Area[]>(initial.areas);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_KM);
  const [pickerKey, setPickerKey] = useState(0);
  // The place being added, and its (possibly map-edited) centre.
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [license, setLicense] = useState<Slot>(() =>
    slotFromUrl(initial.licenseDocUrl)
  );
  const [insurance, setInsurance] = useState<Slot>(() =>
    slotFromUrl(initial.insuranceDocUrl)
  );

  const current = STEP_KEYS[step];
  const isLastStep = step === STEP_KEYS.length - 1;

  const docsReady = Boolean(
    (license.file || license.url) && (insurance.file || insurance.url)
  );

  function toggleSubtype(s: string) {
    setSubtypes((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }

  function selectPlace(p: PlaceResult) {
    setPlace(p);
    setCenter({ lat: p.lat, lng: p.lng });
  }

  function onEditArea(c: CoverageChange) {
    setCenter({ lat: c.lat, lng: c.lng });
    setRadius(c.radiusKm);
  }

  function resetDraft() {
    setPlace(null);
    setCenter(null);
    setPickerKey((k) => k + 1);
  }

  function addArea() {
    if (!place || !center) return;
    if (!(radius >= 1)) {
      showToast("Enter a radius of at least 1 km.", { type: "error" });
      return;
    }
    const label =
      place.formattedAddress ||
      [place.city, place.state].filter(Boolean).join(", ") ||
      "Coverage area";
    setAreas((cur) =>
      cur.some((a) => a.label === label)
        ? cur
        : [
            ...cur,
            { label, lat: center.lat, lng: center.lng, radiusKm: radius },
          ]
    );
    resetDraft();
  }

  function removeArea(index: number) {
    setAreas((cur) => cur.filter((_, i) => i !== index));
  }

  function goStep(n: number) {
    const clamped = Math.max(0, Math.min(STEP_KEYS.length - 1, n));
    setStep(clamped);
    onStepChange?.(clamped);
  }

  const stepValid =
    (current === "company" &&
      companyName.trim().length >= 2 &&
      years.trim() !== "" &&
      bio.trim().length >= BIO_MIN) ||
    (current === "services" && subtypes.length >= 1) ||
    (current === "coverage" && areas.length >= 1) ||
    current === "verify"; // verify (documents) is the one skippable step

  // Saves the matchable basics (full mode only).
  async function saveInfo(): Promise<boolean> {
    const logoUrl = await resolveUrl(logo, "avatars");
    const res = await completeOnboarding({
      companyName: companyName.trim(),
      phone: phone.trim(),
      yearsInBusiness: years.trim() === "" ? null : Number(years),
      bio: bio.trim(),
      logoUrl,
      subtypes,
      areas,
    });
    if (!res.success) {
      showToast(res.error, { type: "error" });
      return false;
    }
    return true;
  }

  async function saveDocs(): Promise<boolean> {
    const [licenseDocUrl, insuranceDocUrl] = await Promise.all([
      resolveUrl(license, "documents"),
      resolveUrl(insurance, "documents"),
    ]);
    const res = await submitVerification({ licenseDocUrl, insuranceDocUrl });
    if (!res.success) {
      showToast(res.error, { type: "error" });
      return false;
    }
    return true;
  }

  // Finish WITH documents (submit for review).
  function finishWithDocs() {
    if (pending) return;
    start(async () => {
      try {
        if (full && !(await saveInfo())) return;
        if (!(await saveDocs())) return;
        onComplete();
      } catch {
        showToast("Upload failed. Please try again.", { type: "error" });
      }
    });
  }

  // Finish WITHOUT documents (full mode only — skip verification for now).
  function finishSkipDocs() {
    if (pending) return;
    start(async () => {
      try {
        if (!(await saveInfo())) return;
        onComplete();
      } catch {
        showToast("Could not save. Please try again.", { type: "error" });
      }
    });
  }

  function next() {
    if (pending) return;
    if (!stepValid) return;
    if (!isLastStep) {
      goStep(step + 1);
      return;
    }
    // On the verify step: documents-only mode requires docs; full mode allows skip.
    if (mode === "documents") finishWithDocs();
    else if (docsReady) finishWithDocs();
    else finishSkipDocs();
  }

  return (
    <div className="flex flex-col">
      {full && showStepper ? (
        <div className="px-1 pb-6 lg:pb-[1.667vw]">
          <Stepper labels={FULL_STEP_LABELS} current={step} />
        </div>
      ) : null}

      <div>
        {current === "company" && (
          <WizardStep
            title="Tell us about your company"
            sub="The basics homeowners and our matching engine need."
          >
            <div className="flex items-center gap-4 lg:gap-[1.111vw]">
              {logo.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local/remote logo preview
                <img
                  src={logo.preview}
                  alt=""
                  className="size-16 lg:size-[5vw] rounded-full border border-border object-cover"
                />
              ) : (
                <span className="grid size-16 lg:size-[5vw] place-items-center rounded-full border-2 border-dashed border-foreground/15 text-foreground/35">
                  <Icon name="image" className="size-6 lg:size-[1.667vw]" />
                </span>
              )}
              <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
                <Button asChild variant="outline" size="sm">
                  <label className="cursor-pointer">
                    {logo.file || logo.url ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) pickInto(setLogo, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                {(logo.file || logo.url) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSlot(setLogo)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <WizardField label="Company name">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Lone Star Roofing Co."
                className="h-11 lg:h-[3.056vw] bg-card"
                autoFocus
              />
            </WizardField>
            <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
              <WizardField label="Phone">
                <PhoneInput
                  value={phone}
                  onChange={(v) => setPhone(v ?? "")}
                  defaultCountry="US"
                  placeholder="(214) 555-0100"
                />
              </WizardField>
              <WizardField label="Years in business">
                <Input
                  value={years}
                  onChange={(e) =>
                    setYears(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  inputMode="numeric"
                  placeholder="12"
                  className="h-11 lg:h-[3.056vw] bg-card"
                />
              </WizardField>
            </div>
            <WizardField
              label="About your company"
              hint="Share your expertise, proudest work, and why customers should choose you."
              error={
                bio.trim().length > 0 && bio.trim().length < BIO_MIN
                  ? "Add a sentence or two more."
                  : undefined
              }
            >
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 600))}
                rows={5}
                placeholder="e.g. Family-run since 2009, we specialize in storm-damage repairs and full roof replacements across the metro. Licensed and insured, with a 10-year workmanship warranty on every job. We show up on time and leave your property cleaner than we found it."
                className="min-h-32 lg:min-h-[9vw] bg-card"
              />
            </WizardField>
          </WizardStep>
        )}

        {current === "services" && (
          <WizardStep
            title="What roofing work do you do?"
            sub="Pick everything you handle. You can change this anytime."
          >
            <WizardField label="Services you offer">
              <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
                {availableSubtypes.map((s) => (
                  <OptionCard
                    key={s}
                    label={s}
                    icon={SUBTYPE_META[s]?.icon}
                    desc={SUBTYPE_META[s]?.desc}
                    active={subtypes.includes(s)}
                    onClick={() => toggleSubtype(s)}
                  />
                ))}
              </div>
            </WizardField>
          </WizardStep>
        )}

        {current === "coverage" && (
          <WizardStep
            title="Where do you work?"
            sub="Add the areas you serve and how far you travel. We only send you leads inside them."
          >
            <div className="flex flex-col gap-3 lg:gap-[0.833vw] sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <WizardField label="Add a place or area">
                  <GooglePlacesInput
                    key={pickerKey}
                    mode="address"
                    placeholder="Search a city, area, or place…"
                    onPlaceSelect={selectPlace}
                    className="h-11 lg:h-[3.056vw] bg-card text-left"
                  />
                </WizardField>
              </div>
              <WizardField label="Radius (km)">
                <Input
                  type="number"
                  min={1}
                  max={800}
                  step="any"
                  value={Number.isFinite(radius) ? radius : ""}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="h-11 lg:h-[3.056vw] w-full sm:w-24 lg:w-[7vw] bg-card"
                  aria-label="Coverage radius in kilometres"
                />
              </WizardField>
              <Button
                type="button"
                onClick={addArea}
                disabled={!place}
                size="lg"
                className="h-11 lg:h-[3.056vw] w-full sm:w-auto font-semibold whitespace-nowrap"
              >
                <span>Add coverage area</span>
              </Button>
            </div>

            {place && center && (
              <div className="space-y-1.5 lg:space-y-[0.417vw]">
                <CoverageAreaEditor
                  center={center}
                  radiusKm={radius}
                  onChange={onEditArea}
                  className="h-56 lg:h-[16vw] w-full"
                />
                <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
                  Serving a {Number.isFinite(radius) ? radius : 0} km radius
                  around{" "}
                  <span className="font-medium text-foreground/80">
                    {place.city || place.formattedAddress}
                  </span>
                  . Drag the circle to fine-tune, then add it.
                </p>
              </div>
            )}

            {areas.length > 0 ? (
              <ul className="divide-y divide-border rounded-md lg:rounded-[0.556vw] border border-border">
                {areas.map((a, i) => (
                  <li
                    key={`${a.label}-${i}`}
                    className="flex items-center justify-between gap-3 lg:gap-[0.833vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
                        {a.label}
                      </p>
                      <p className="text-[13px] lg:text-[0.903vw] text-muted-foreground">
                        Serving a {a.radiusKm} km radius
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArea(i)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </WizardStep>
        )}

        {current === "verify" &&
          (full ? (
            <WizardStep
              title={
                rejected ? "Resubmit your documents" : "Verify your business"
              }
              sub={
                rejected
                  ? "Your last submission needs another look. Upload current documents and we'll review again."
                  : "Upload your license and insurance. We review them within a day, and verified roofers win more work."
              }
            >
              <FileField
                label="License document"
                slot={license}
                setSlot={setLicense}
              />
              <FileField
                label="Insurance certificate"
                slot={insurance}
                setSlot={setInsurance}
              />
            </WizardStep>
          ) : (
            // documents mode: the parent dialog already shows the title/description.
            <div className="space-y-5 lg:space-y-[2vw]">
              <FileField
                label="License document"
                slot={license}
                setSlot={setLicense}
              />
              <FileField
                label="Insurance certificate"
                slot={insurance}
                setSlot={setInsurance}
              />
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="mt-10 lg:mt-[3vw] flex items-center justify-between gap-3 lg:gap-[0.833vw]">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => goStep(step - 1)}
          className={cn(
            step === 0 && "invisible",
            "bg-background hover:bg-background hover:border-foreground/50 px-7 lg:px-[2vw] font-semibold"
          )}
        >
          Back
        </Button>

        <div className="flex items-center gap-2 lg:gap-[0.556vw]">
          {full && current === "verify" && !docsReady ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={finishSkipDocs}
              disabled={pending}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              Skip & Finish
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={next}
            disabled={!stepValid || pending}
            className="px-7 lg:px-[2vw] font-semibold"
          >
            {!isLastStep
              ? "Next"
              : pending
              ? "Saving…"
              : mode === "documents"
              ? "Submit for review"
              : docsReady
              ? "Submit for review"
              : "Finish setup"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileField({
  label,
  slot,
  setSlot,
}: {
  label: string;
  slot: Slot;
  setSlot: Dispatch<SetStateAction<Slot>>;
}) {
  const has = Boolean(slot.file || slot.url);
  const kind = slotKind(slot);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickInto(setSlot, f);
    e.target.value = "";
  }

  return (
    <div className="text-left">
      <Label className="mb-1.5 lg:mb-[0.417vw] block">{label}</Label>
      {has ? (
        <div className="space-y-2.5 lg:space-y-[0.694vw]">
          <div className="overflow-hidden rounded-md lg:rounded-[0.4vw] border border-border bg-muted/30">
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- local/remote doc preview
              <img
                src={slot.preview ?? undefined}
                alt={label}
                className="mx-auto max-h-48 lg:max-h-[13vw] w-full object-contain"
              />
            ) : kind === "pdf" ? (
              <iframe
                src={slot.preview ?? undefined}
                title={label}
                className="h-48 lg:h-[13vw] w-full"
              />
            ) : (
              <div className="flex h-32 lg:h-[9vw] items-center justify-center text-foreground/40">
                <Icon name="document" className="size-6 lg:size-[1.667vw]" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
            <Button asChild variant="outline" size="sm">
              <label className="cursor-pointer">
                Replace
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  onChange={onPick}
                />
              </label>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearSlot(setSlot)}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.4vw] border-2 border-dashed border-foreground/15 px-4 lg:px-[1.111vw] py-6 lg:py-[1.667vw] text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={onPick}
          />
          <span className="flex size-10 lg:size-[2.778vw] items-center justify-center rounded-full bg-muted text-foreground/50">
            <Icon name="upload" className="size-5 lg:size-[1.25vw]" />
          </span>
          <p className="text-sm lg:text-[0.972vw] font-semibold">
            Click to upload
          </p>
          <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
            PDF or image, up to 10MB
          </p>
        </label>
      )}
    </div>
  );
}

export function Stepper({
  labels,
  current,
}: {
  labels: string[];
  current: number;
}) {
  return (
    <ol className="flex items-center justify-center">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center">
            <span
              className={cn(
                "flex size-6 lg:size-[1.667vw] shrink-0 items-center justify-center rounded-full border text-[11px] lg:text-[0.764vw] font-semibold transition-colors",
                active && "border-foreground bg-foreground text-background",
                done &&
                  "border-secondary bg-secondary text-secondary-foreground",
                !active && !done && "border-border text-foreground/40"
              )}
            >
              {done ? (
                <Icon name="tick" className="size-3 lg:size-[0.9vw]" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                "ml-2 lg:ml-[0.556vw] hidden text-xs lg:text-[0.833vw] font-medium transition-colors sm:inline",
                active ? "text-foreground" : "text-foreground/45"
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <span className="mx-3 lg:mx-[0.833vw] h-px lg:h-[0.069vw] w-8 lg:w-[2.222vw] bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
