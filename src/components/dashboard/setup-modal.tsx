"use client";

import {
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/reui/phone-input";
import { uploadToCloudinary } from "@/lib/cloudinary/upload";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type SetupResult = { ok: boolean; error?: string };

export type SetupData = {
  logoUrl: string | null;
  companyName: string;
  phone: string;
  bio: string;
  licenseDocUrl: string;
  insuranceDocUrl: string;
};

type Initial = {
  logoUrl: string | null;
  companyName: string;
  phone: string;
  bio: string;
  licenseDocUrl: string | null;
  insuranceDocUrl: string | null;
};

// A file the user has chosen but not yet uploaded. `file` = a fresh pick (held
// locally until confirm), `url` = an already-stored Cloudinary URL, `preview` =
// a displayable src (object URL for picks, the URL for stored files).
type Slot = { file: File | null; url: string | null; preview: string | null };

function isImage(f: File) {
  return f.type.startsWith("image/");
}
function isImageUrl(u: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(u.split("?")[0]);
}
function slotKind(slot: Slot): "image" | "pdf" | "file" {
  if (slot.file) {
    if (isImage(slot.file)) return "image";
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
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function fileMeta(f: File) {
  const kind =
    f.type === "application/pdf"
      ? "PDF"
      : f.type.startsWith("image/")
        ? "Image"
        : "File";
  return `${kind} · ${formatBytes(f.size)}`;
}
function slotFromUrl(url: string | null): Slot {
  return { file: null, url, preview: url };
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

const STEPS = [
  {
    title: "Tell us about your business",
    desc: "A few details homeowners and our matching engine use.",
  },
  {
    title: "Verify your business",
    desc: "Upload your license and insurance. We review them within a day.",
  },
] as const;

function celebrate() {
  confetti({
    particleCount: 160,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.5 },
  });
  const end = Date.now() + 700;
  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 60,
      startVelocity: 55,
      origin: { x: 0, y: 0.7 },
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 60,
      startVelocity: 55,
      origin: { x: 1, y: 0.7 },
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function SetupModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Initial;
  onSubmit: (data: SetupData) => Promise<SetupResult>;
  onDone?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, startSubmit] = useTransition();

  const [logo, setLogo] = useState<Slot>(() => slotFromUrl(initial.logoUrl));
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [phone, setPhone] = useState(initial.phone);
  const [bio, setBio] = useState(initial.bio);
  const [license, setLicense] = useState<Slot>(() =>
    slotFromUrl(initial.licenseDocUrl),
  );
  const [insurance, setInsurance] = useState<Slot>(() =>
    slotFromUrl(initial.insuranceDocUrl),
  );

  const step0Valid = companyName.trim().length >= 2;
  const step1Valid =
    Boolean(license.file || license.url) &&
    Boolean(insurance.file || insurance.url);
  const isLast = step === 1;

  function reset() {
    setStep(0);
    setDone(false);
  }
  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function resolveUrl(slot: Slot, folder: "avatars" | "documents") {
    if (slot.file)
      return (await uploadToCloudinary(slot.file, folder)).secureUrl;
    return slot.url;
  }

  function handleNext() {
    if (step === 0) {
      if (!step0Valid)
        return showToast("Enter your company name", { type: "error" });
      setStep(1);
      return;
    }
    if (!step1Valid)
      return showToast("Upload both documents to finish", { type: "error" });
    // Upload the held files to Cloudinary now (on confirm), then save.
    startSubmit(async () => {
      try {
        const [logoUrl, licenseDocUrl, insuranceDocUrl] = await Promise.all([
          resolveUrl(logo, "avatars"),
          resolveUrl(license, "documents"),
          resolveUrl(insurance, "documents"),
        ]);
        const res = await onSubmit({
          logoUrl,
          companyName: companyName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          licenseDocUrl: licenseDocUrl as string,
          insuranceDocUrl: insuranceDocUrl as string,
        });
        if (!res.ok)
          return showToast(res.error ?? "Something went wrong", {
            type: "error",
          });
        setDone(true);
        window.setTimeout(celebrate, 120);
      } catch {
        showToast("Upload failed. Please try again.", { type: "error" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        {done ? (
          <div className="px-8 pb-8 pt-10 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <BigCheck />
            </div>
            <DialogTitle className="mt-5 font-sebenta text-2xl font-bold">
              You’re all set!
            </DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed">
              We’re reviewing your documents now. We’ll let you know the moment
              you’re verified, usually within a day.
            </DialogDescription>
            <Button
              size="lg"
              className="mt-7 w-full"
              onClick={() => {
                onOpenChange(false);
                reset();
                onDone?.();
              }}
            >
              Go to dashboard
            </Button>
          </div>
        ) : (
          <>
            {/* sticky header: close (from DialogContent) + progress */}
            <div className="shrink-0 border-b border-border px-7 pb-6 pt-7">
              <div className="flex items-center justify-start gap-2">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 w-12 rounded-full transition-colors",
                      i <= step ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* scrollable middle */}
            <div className="flex-1 overflow-y-auto px-7 py-6">
              <DialogHeader>
                <DialogTitle>{STEPS[step].title}</DialogTitle>
                <DialogDescription>{STEPS[step].desc}</DialogDescription>
              </DialogHeader>

              <div className="mt-7">
                {step === 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {logo.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo.preview}
                          alt=""
                          className="size-16 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <div className="grid size-16 place-items-center rounded-full border-2 border-dashed border-foreground/15 text-foreground/35">
                          <ImageGlyph />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Button asChild variant="outline" size="sm">
                          <label>
                            {logo.file || logo.url
                              ? "Change logo"
                              : "Upload logo"}
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

                    <Field label="Company name">
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Lone Star Roofing Co."
                      />
                    </Field>
                    <Field label="Phone (optional)">
                      <PhoneInput
                        value={phone}
                        onChange={(v) => setPhone(v ?? "")}
                        defaultCountry="US"
                        placeholder="(214) 555-0100"
                      />
                    </Field>
                    <Field label="About (optional)">
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        maxLength={600}
                        placeholder="A line or two about your company and the work you take pride in."
                        className="resize-none"
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                )}
              </div>
            </div>

            {/* sticky footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-7 py-4">
              <Button
                variant="ghost"
                onClick={() => setStep(0)}
                className={cn(step === 0 && "invisible")}
              >
                Previous
              </Button>
              <Button
                size="lg"
                className="px-8"
                disabled={
                  (step === 0 ? !step0Valid : !step1Valid) || submitting
                }
                onClick={handleNext}
              >
                {isLast ? (submitting ? "Finishing..." : "Finish") : "Next"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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
    <div>
      <Label className="mb-1.5">{label}</Label>
      {has ? (
        <div className="space-y-2.5">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.preview ?? undefined}
                alt={label}
                className="mx-auto max-h-56 w-full object-contain"
              />
            ) : kind === "pdf" ? (
              <iframe
                src={slot.preview ?? undefined}
                title={label}
                className="h-56 w-full"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-foreground/40">
                <FileGlyph />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Button asChild variant="outline" size="sm">
                <label>
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
            {slot.file ? (
              <span className="text-xs text-muted-foreground">
                {fileMeta(slot.file)}
              </span>
            ) : slot.url ? (
              <a
                href={slot.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                Open
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 px-4 py-7 text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={onPick}
          />
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground/50">
            <UploadGlyph />
          </span>
          <p className="text-sm font-semibold">Click to upload</p>
          <p className="text-xs text-muted-foreground">
            PDF or image, up to 10MB
          </p>
        </label>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function BigCheck() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 15V4m0 0L8 8m4-4l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="9" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M4 16l4.5-4 4 3.5 3-2.5 4.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
