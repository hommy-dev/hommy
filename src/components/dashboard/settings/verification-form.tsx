"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { submitVerification } from "@/lib/actions/profile"
import { showToast } from "@/components/ui/toast"
import { ImageUpload } from "@/components/ui/image-upload"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { VerificationState } from "@/lib/contractor/verification"
import { cn } from "@/lib/utils"

export function VerificationForm({
  initial,
  canManage,
}: {
  initial: {
    licenseDocUrl: string | null
    insuranceDocUrl: string | null
    state: VerificationState
  }
  canManage: boolean
}) {
  const router = useRouter()
  const [licenseDocUrl, setLicenseDocUrl] = useState(initial.licenseDocUrl)
  const [insuranceDocUrl, setInsuranceDocUrl] = useState(initial.insuranceDocUrl)
  const [state, setState] = useState<VerificationState>(initial.state)
  const [pending, start] = useTransition()

  const docsChanged =
    licenseDocUrl !== initial.licenseDocUrl ||
    insuranceDocUrl !== initial.insuranceDocUrl
  const showSubmit = canManage && (state !== "in_review" || docsChanged)

  const submitLabel =
    state === "rejected"
      ? "Resubmit for review"
      : state === "in_review"
        ? "Update submission"
        : "Submit for review"

  function submit() {
    if (!licenseDocUrl || !insuranceDocUrl) {
      showToast("Upload both documents to submit", { type: "error" })
      return
    }
    start(async () => {
      const res = await submitVerification({ licenseDocUrl, insuranceDocUrl })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      setState("in_review")
      showToast("Submitted for verification", { type: "success" })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5 lg:space-y-[1.389vw]">
      <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
          We verify every roofer before they can engage leads.
        </p>
        <StatusBadge state={state} />
      </div>

      {state === "verified" ? (
        <div className="rounded-md lg:rounded-[0.556vw] border border-secondary/40 bg-secondary/15 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] text-foreground/75">
          Your business is verified — you’re set to engage leads and send quotes.
        </div>
      ) : (
        <>
          {state === "rejected" && (
            <div className="rounded-md lg:rounded-[0.556vw] border border-destructive/30 bg-destructive/5 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] text-destructive">
              Your last submission needs attention. Update your documents and
              resubmit.
            </div>
          )}
          {state === "in_review" && (
            <div className="rounded-md lg:rounded-[0.556vw] border border-amber-300/50 bg-amber-50 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              We’re reviewing your documents. You can update them while you wait.
            </div>
          )}

          <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
            <DocField
              label="License document"
              url={licenseDocUrl}
              onChange={setLicenseDocUrl}
              canManage={canManage}
            />
            <DocField
              label="Insurance certificate"
              url={insuranceDocUrl}
              onChange={setInsuranceDocUrl}
              canManage={canManage}
            />
          </div>

          {showSubmit ? (
            <div className="flex justify-end">
              <Button
                onClick={submit}
                disabled={pending}
                size="lg"
                className="font-semibold"
              >
                {pending ? "Submitting…" : submitLabel}
              </Button>
            </div>
          ) : null}

          {!canManage ? (
            <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
              Only owners and admins can manage verification.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

function urlKind(u: string): "image" | "pdf" | "file" {
  const path = u.split("?")[0]
  if (/\.(png|jpe?g|webp|gif|avif)$/i.test(path)) return "image"
  if (/\.pdf$/i.test(path)) return "pdf"
  return "file"
}

function DocField({
  label,
  url,
  onChange,
  canManage,
}: {
  label: string
  url: string | null
  onChange: (u: string | null) => void
  canManage: boolean
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
        {label}
      </Label>

      {url ? (
        <div className="space-y-2.5 lg:space-y-[0.694vw]">
          <div className="overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-muted/30">
            {urlKind(url) === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={label}
                className="mx-auto max-h-48 lg:max-h-[13.333vw] w-full object-contain"
              />
            ) : urlKind(url) === "pdf" ? (
              <iframe src={url} title={label} className="h-48 lg:h-[13.333vw] w-full" />
            ) : (
              <div className="flex h-32 lg:h-[8.889vw] items-center justify-center text-foreground/40">
                <FileGlyph />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
            {canManage ? (
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
            ) : (
              <span />
            )}
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
      ) : canManage ? (
        <ImageUpload
          folder="documents"
          accept="image+pdf"
          onUpload={(r) => onChange(r.secureUrl)}
          className="w-full [&>button]:w-full"
        >
          <span className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-7 lg:py-[1.944vw] text-center transition-colors hover:border-foreground/30 hover:bg-muted/40">
            <span className="flex size-9 lg:size-[2.5vw] items-center justify-center rounded-full bg-muted text-foreground/50">
              <UploadGlyph />
            </span>
            <span className="text-sm lg:text-[0.972vw] font-semibold">Click to upload</span>
            <span className="text-xs lg:text-[0.833vw] text-muted-foreground">
              PDF or image, up to 10MB
            </span>
          </span>
        </ImageUpload>
      ) : (
        <div className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-7 lg:py-[1.944vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          Not uploaded
        </div>
      )}
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
      cls: "bg-destructive/10 text-destructive",
    },
    not_started: { label: "Not started", cls: "bg-muted text-muted-foreground" },
  }
  const v = map[state]
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-semibold",
        v.cls,
      )}
    >
      {v.label}
    </span>
  )
}

function UploadGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
