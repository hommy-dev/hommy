"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImageUpload, UploadedImagePreview } from "@/components/ui/image-upload"
import { buttonVariants } from "@/components/ui/button"
import {
  updateBusinessProfile,
  submitVerification,
} from "@/lib/actions/profile"
import { showToast } from "@/components/ui/toast"
import type { VerificationState } from "@/lib/contractor/verification"
import { cn } from "@/lib/utils"

type Initial = {
  companyName: string
  bio: string
  logoUrl: string | null
  licenseDocUrl: string | null
  insuranceDocUrl: string | null
  verificationState: VerificationState
}

const inputCls =
  "w-full rounded-xl lg:rounded-[0.926vw] border border-foreground/15 bg-card px-3.5 lg:px-[0.972vw] py-2.5 lg:py-[0.694vw] text-[15px] lg:text-[1.042vw] text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter()

  const [companyName, setCompanyName] = useState(initial.companyName)
  const [bio, setBio] = useState(initial.bio)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [savingProfile, startProfile] = useTransition()

  const [licenseDocUrl, setLicenseDocUrl] = useState<string | null>(initial.licenseDocUrl)
  const [insuranceDocUrl, setInsuranceDocUrl] = useState<string | null>(initial.insuranceDocUrl)
  const [submitting, startSubmit] = useTransition()
  const [state, setState] = useState<VerificationState>(initial.verificationState)

  function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    startProfile(async () => {
      const res = await updateBusinessProfile({
        companyName: companyName.trim(),
        bio: bio.trim(),
        logoUrl,
      })
      if (!res.success) return showToast(res.error, { type: "error" })
      showToast("Profile saved", { type: "success" })
      router.refresh()
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!licenseDocUrl || !insuranceDocUrl) {
      return showToast("Upload both documents to submit", { type: "error" })
    }
    startSubmit(async () => {
      const res = await submitVerification({ licenseDocUrl, insuranceDocUrl })
      if (!res.success) return showToast(res.error, { type: "error" })
      setState("in_review")
      showToast("Submitted for verification", { type: "success" })
      router.refresh()
    })
  }

  const docsChanged =
    licenseDocUrl !== initial.licenseDocUrl ||
    insuranceDocUrl !== initial.insuranceDocUrl

  // While in review the documents are already submitted, so there's nothing to
  // do unless the contractor actually swaps a file. Only then do we surface the
  // re-submit action.
  const showSubmit = state !== "in_review" || docsChanged

  const submitLabel =
    state === "rejected"
      ? "Resubmit for review"
      : state === "in_review"
        ? "Update submission"
        : "Submit for review"

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      {/* Business profile */}
      <form
        onSubmit={saveProfile}
        className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-6 lg:p-[1.667vw]"
      >
        <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
          Business profile
        </h2>
        <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          This is what homeowners see.
        </p>

        <div className="mt-5 lg:mt-[1.389vw] space-y-4 lg:space-y-[1.111vw]">
          <Field label="Company name">
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls}
              placeholder="Lone Star Roofing Co."
            />
          </Field>
          <Field label="About (optional)">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={600}
              className={cn(inputCls, "resize-none")}
              placeholder="A line or two about your company and the work you take pride in."
            />
          </Field>
          <Field label="Logo (optional)">
            <div className="flex items-center gap-4 lg:gap-[1.111vw]">
              {logoUrl ? (
                <UploadedImagePreview url={logoUrl} onRemove={() => setLogoUrl(null)} />
              ) : (
                <div className="grid size-24 lg:size-[6.667vw] place-items-center rounded-md lg:rounded-[0.556vw] border border-dashed border-foreground/20 text-xs lg:text-[0.833vw] text-muted-foreground">
                  No logo
                </div>
              )}
              <ImageUpload
                folder="avatars"
                accept="image"
                onUpload={(r) => setLogoUrl(r.secureUrl)}
              >
                <span className="rounded-lg lg:rounded-[0.694vw] border border-foreground/15 px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium transition-colors hover:bg-muted">
                  {logoUrl ? "Change logo" : "Upload logo"}
                </span>
              </ImageUpload>
            </div>
          </Field>
        </div>

        <div className="mt-6 lg:mt-[1.667vw]">
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl lg:rounded-[0.926vw] bg-foreground px-5 lg:px-[1.389vw] py-2.5 lg:py-[0.694vw] text-sm lg:text-[0.972vw] font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>

      {/* Verification */}
      <form
        onSubmit={submit}
        className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-6 lg:p-[1.667vw]"
      >
        <div className="flex items-start justify-between gap-3 lg:gap-[0.833vw]">
          <div>
            <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
              Verification
            </h2>
            <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
              We verify every roofer before they can engage leads.
            </p>
          </div>
          <StatusBadge state={state} />
        </div>

        {state === "verified" ? (
          <p className="mt-5 lg:mt-[1.389vw] rounded-xl lg:rounded-[0.926vw] bg-secondary/40 p-4 lg:p-[1.111vw] text-sm lg:text-[0.972vw] text-foreground/75">
            Your business is verified. You’re all set to engage leads and send
            quotes.
          </p>
        ) : (
          <>
            {state === "rejected" && (
              <p className="mt-4 lg:mt-[1.111vw] rounded-xl lg:rounded-[0.926vw] bg-red-50 p-3 lg:p-[0.833vw] text-sm lg:text-[0.972vw] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                Your last submission needs attention. Update your details and
                resubmit.
              </p>
            )}
            {state === "in_review" && (
              <p className="mt-4 lg:mt-[1.111vw] rounded-xl lg:rounded-[0.926vw] bg-amber-50 p-3 lg:p-[0.833vw] text-sm lg:text-[0.972vw] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                We’re reviewing your documents. You can update them while you
                wait.
              </p>
            )}

            <div className="mt-5 lg:mt-[1.389vw] space-y-4 lg:space-y-[1.111vw]">
              <DocField
                label="License document"
                url={licenseDocUrl}
                onChange={setLicenseDocUrl}
              />
              <DocField
                label="Insurance certificate"
                url={insuranceDocUrl}
                onChange={setInsuranceDocUrl}
              />
            </div>

            {showSubmit && (
              <div className="mt-6 lg:mt-[1.667vw]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl lg:rounded-[0.926vw] bg-primary px-5 lg:px-[1.389vw] py-2.5 lg:py-[0.694vw] text-sm lg:text-[0.972vw] font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : submitLabel}
                </button>
              </div>
            )}
          </>
        )}
      </form>
    </div>
  )
}

function isImageUrl(u: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(u.split("?")[0])
}

function urlKind(u: string): "image" | "pdf" | "file" {
  if (isImageUrl(u)) return "image"
  if (/\.pdf(\?|$)/i.test(u)) return "pdf"
  return "file"
}

function DocField({
  label,
  url,
  onChange,
}: {
  label: string
  url: string | null
  onChange: (u: string | null) => void
}) {
  return (
    <div>
      <label className="mb-1.5 lg:mb-[0.417vw] block text-[13px] lg:text-[0.903vw] font-medium text-foreground/75">
        {label}
      </label>
      {url ? (
        <div className="space-y-2.5 lg:space-y-[0.694vw]">
          <div className="overflow-hidden rounded-xl lg:rounded-[0.926vw] border border-border bg-muted/30">
            {urlKind(url) === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={label}
                className="mx-auto max-h-56 lg:max-h-[15.556vw] w-full object-contain"
              />
            ) : urlKind(url) === "pdf" ? (
              <iframe src={url} title={label} className="h-56 lg:h-[15.556vw] w-full" />
            ) : (
              <div className="flex h-40 lg:h-[11.111vw] items-center justify-center text-foreground/40">
                <FileGlyph />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
            <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
              <ImageUpload
                folder="documents"
                accept="image+pdf"
                onUpload={(r) => onChange(r.secureUrl)}
              >
                <span className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Replace
                </span>
              </ImageUpload>
              <button
                type="button"
                onClick={() => onChange(null)}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Remove
              </button>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs lg:text-[0.833vw] font-medium text-primary hover:underline"
            >
              Open
            </a>
          </div>
        </div>
      ) : (
        <ImageUpload
          folder="documents"
          accept="image+pdf"
          onUpload={(r) => onChange(r.secureUrl)}
          className="w-full [&>button]:w-full"
        >
          <span className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 lg:gap-[0.556vw] rounded-xl lg:rounded-[0.926vw] border-2 border-dashed border-foreground/15 px-4 lg:px-[1.111vw] py-7 lg:py-[1.944vw] text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
            <span className="flex size-10 lg:size-[2.778vw] items-center justify-center rounded-full bg-muted text-foreground/50">
              <UploadGlyph />
            </span>
            <span className="text-sm lg:text-[0.972vw] font-semibold">Click to upload</span>
            <span className="text-xs lg:text-[0.833vw] text-muted-foreground">
              PDF or image, up to 10MB
            </span>
          </span>
        </ImageUpload>
      )}
    </div>
  )
}

function UploadGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  )
}

function FileGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  )
}

function StatusBadge({ state }: { state: VerificationState }) {
  const map: Record<VerificationState, { label: string; cls: string }> = {
    verified: { label: "Verified", cls: "bg-secondary text-secondary-foreground" },
    in_review: {
      label: "In review",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    },
    rejected: {
      label: "Needs attention",
      cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
    not_started: { label: "Not started", cls: "bg-muted text-muted-foreground" },
  }
  const v = map[state]
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-semibold", v.cls)}>
      {v.label}
    </span>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <label className="text-[13px] lg:text-[0.903vw] font-medium text-foreground/75">{label}</label>
      {children}
    </div>
  )
}
