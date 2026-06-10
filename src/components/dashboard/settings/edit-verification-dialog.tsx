"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitVerification } from "@/lib/actions/profile"
import { showToast } from "@/components/ui/toast"
import { ImageUpload } from "@/components/ui/image-upload"
import { Button, buttonVariants } from "@/components/ui/button"
import { EditDialog, Field } from "./edit-dialog"
import { cn } from "@/lib/utils"

export function EditVerificationDialog({
  initial,
  resubmit,
}: {
  initial: { licenseDocUrl: string | null; insuranceDocUrl: string | null }
  resubmit: boolean
}) {
  const router = useRouter()
  const [licenseDocUrl, setLicenseDocUrl] = useState(initial.licenseDocUrl)
  const [insuranceDocUrl, setInsuranceDocUrl] = useState(initial.insuranceDocUrl)

  function reset() {
    setLicenseDocUrl(initial.licenseDocUrl)
    setInsuranceDocUrl(initial.insuranceDocUrl)
  }

  async function save(): Promise<boolean> {
    if (!licenseDocUrl || !insuranceDocUrl) {
      showToast("Upload both documents to submit", { type: "error" })
      return false
    }
    const res = await submitVerification({ licenseDocUrl, insuranceDocUrl })
    if (!res.success) {
      showToast(res.error, { type: "error" })
      return false
    }
    showToast("Submitted for verification", { type: "success" })
    router.refresh()
    return true
  }

  return (
    <EditDialog
      title={resubmit ? "Update documents" : "Get verified"}
      description="We verify every roofer before they can engage leads."
      triggerLabel={resubmit ? "Update" : "Get verified"}
      triggerIcon="shield-done"
      onOpen={reset}
      onSave={save}
      canSave={!!licenseDocUrl && !!insuranceDocUrl}
      saveLabel="Submit for review"
      wide
    >
      <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
        <Field label="License document">
          <DocUpload url={licenseDocUrl} onChange={setLicenseDocUrl} />
        </Field>
        <Field label="Insurance certificate">
          <DocUpload url={insuranceDocUrl} onChange={setInsuranceDocUrl} />
        </Field>
      </div>
    </EditDialog>
  )
}

function urlKind(u: string): "image" | "pdf" | "file" {
  const path = u.split("?")[0]
  if (/\.(png|jpe?g|webp|gif|avif)$/i.test(path)) return "image"
  if (/\.pdf$/i.test(path)) return "pdf"
  return "file"
}

function DocUpload({
  url,
  onChange,
}: {
  url: string | null
  onChange: (u: string | null) => void
}) {
  if (!url) {
    return (
      <ImageUpload
        folder="documents"
        accept="image+pdf"
        onUpload={(r) => onChange(r.secureUrl)}
        className="w-full [&>button]:w-full"
      >
        <span className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-6 lg:py-[1.667vw] text-center transition-colors hover:border-foreground/30 hover:bg-muted/40">
          <span className="text-sm lg:text-[0.972vw] font-semibold">Click to upload</span>
          <span className="text-xs lg:text-[0.833vw] text-muted-foreground">
            PDF or image
          </span>
        </span>
      </ImageUpload>
    )
  }

  return (
    <div className="space-y-2 lg:space-y-[0.556vw]">
      <div className="overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-muted/30">
        {urlKind(url) === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="mx-auto max-h-32 lg:max-h-[8.889vw] w-full object-contain" />
        ) : (
          <iframe src={url} title="Document" className="h-32 lg:h-[8.889vw] w-full" />
        )}
      </div>
      <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
        <ImageUpload folder="documents" accept="image+pdf" onUpload={(r) => onChange(r.secureUrl)}>
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Replace
          </span>
        </ImageUpload>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Remove
        </Button>
      </div>
    </div>
  )
}
