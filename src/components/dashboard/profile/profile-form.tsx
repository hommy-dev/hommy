"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImageUpload, UploadedImagePreview } from "@/components/ui/image-upload"
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
  licenseNumber: string
  insuranceProvider: string
  insurancePolicy: string
  licenseDocUrl: string | null
  insuranceDocUrl: string | null
  verificationState: VerificationState
}

const inputCls =
  "w-full rounded-xl border border-foreground/15 bg-card px-3.5 py-2.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter()

  const [companyName, setCompanyName] = useState(initial.companyName)
  const [bio, setBio] = useState(initial.bio)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [savingProfile, startProfile] = useTransition()

  const [licenseNumber, setLicenseNumber] = useState(initial.licenseNumber)
  const [insuranceProvider, setInsuranceProvider] = useState(initial.insuranceProvider)
  const [insurancePolicy, setInsurancePolicy] = useState(initial.insurancePolicy)
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
      const res = await submitVerification({
        licenseNumber: licenseNumber.trim(),
        insuranceProvider: insuranceProvider.trim(),
        insurancePolicy: insurancePolicy.trim(),
        licenseDocUrl,
        insuranceDocUrl,
      })
      if (!res.success) return showToast(res.error, { type: "error" })
      setState("in_review")
      showToast("Submitted for verification", { type: "success" })
      router.refresh()
    })
  }

  const submitLabel =
    state === "rejected"
      ? "Resubmit for review"
      : state === "in_review"
        ? "Update submission"
        : "Submit for review"

  return (
    <div className="space-y-6">
      {/* Business profile */}
      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="font-sebenta text-lg font-bold tracking-tight">
          Business profile
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This is what homeowners see.
        </p>

        <div className="mt-5 space-y-4">
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
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <UploadedImagePreview url={logoUrl} onRemove={() => setLogoUrl(null)} />
              ) : (
                <div className="grid size-24 place-items-center rounded-md border border-dashed border-foreground/20 text-xs text-muted-foreground">
                  No logo
                </div>
              )}
              <ImageUpload
                folder="avatars"
                accept="image"
                onUpload={(r) => setLogoUrl(r.secureUrl)}
              >
                <span className="rounded-lg border border-foreground/15 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                  {logoUrl ? "Change logo" : "Upload logo"}
                </span>
              </ImageUpload>
            </div>
          </Field>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>

      {/* Verification */}
      <form
        onSubmit={submit}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sebenta text-lg font-bold tracking-tight">
              Verification
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              We verify every roofer before they can engage leads.
            </p>
          </div>
          <StatusBadge state={state} />
        </div>

        {state === "verified" ? (
          <p className="mt-5 rounded-xl bg-secondary/40 p-4 text-sm text-foreground/75">
            Your business is verified. You’re all set to engage leads and send
            quotes.
          </p>
        ) : (
          <>
            {state === "rejected" && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                Your last submission needs attention. Update your details and
                resubmit.
              </p>
            )}
            {state === "in_review" && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                We’re reviewing your documents. You can update them while you
                wait.
              </p>
            )}

            <div className="mt-5 space-y-4">
              <Field label="License number">
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className={inputCls}
                  placeholder="TX-ROOF-00000"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Insurance provider">
                  <input
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className={inputCls}
                    placeholder="Acme Insurance"
                  />
                </Field>
                <Field label="Policy number">
                  <input
                    value={insurancePolicy}
                    onChange={(e) => setInsurancePolicy(e.target.value)}
                    className={inputCls}
                    placeholder="POL-000000"
                  />
                </Field>
              </div>

              <DocField
                label="License document"
                url={licenseDocUrl}
                onUpload={setLicenseDocUrl}
              />
              <DocField
                label="Insurance certificate"
                url={insuranceDocUrl}
                onUpload={setInsuranceDocUrl}
              />
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? "Submitting..." : submitLabel}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

function DocField({
  label,
  url,
  onUpload,
}: {
  label: string
  url: string | null
  onUpload: (u: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            View uploaded file
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">PDF or image, up to 10MB</p>
        )}
      </div>
      <ImageUpload
        folder="documents"
        accept="image+pdf"
        onUpload={(r) => onUpload(r.secureUrl)}
      >
        <span className="shrink-0 rounded-lg border border-foreground/15 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
          {url ? "Replace" : "Upload"}
        </span>
      </ImageUpload>
    </div>
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
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", v.cls)}>
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
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground/75">{label}</label>
      {children}
    </div>
  )
}
