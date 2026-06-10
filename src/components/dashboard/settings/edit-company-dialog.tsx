"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateBusinessProfile } from "@/lib/actions/profile"
import { showToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload, UploadedImagePreview } from "@/components/ui/image-upload"
import { EditDialog, Field } from "./edit-dialog"

type Initial = {
  companyName: string
  bio: string
  logoUrl: string | null
  yearsInBusiness: number | null
}

export function EditCompanyDialog({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [companyName, setCompanyName] = useState(initial.companyName)
  const [bio, setBio] = useState(initial.bio)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [years, setYears] = useState(
    initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : "",
  )

  function reset() {
    setCompanyName(initial.companyName)
    setBio(initial.bio)
    setLogoUrl(initial.logoUrl)
    setYears(initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : "")
  }

  async function save(): Promise<boolean> {
    const res = await updateBusinessProfile({
      companyName: companyName.trim(),
      bio: bio.trim(),
      logoUrl,
      yearsInBusiness: years.trim() === "" ? null : Number(years),
    })
    if (!res.success) {
      showToast(res.error, { type: "error" })
      return false
    }
    showToast("Company saved", { type: "success" })
    router.refresh()
    return true
  }

  return (
    <EditDialog
      title="Edit company profile"
      onOpen={reset}
      onSave={save}
      canSave={companyName.trim().length >= 2}
      wide
    >
      <Field label="Logo">
        <div className="flex items-center gap-4 lg:gap-[1.111vw]">
          {logoUrl ? (
            <UploadedImagePreview url={logoUrl} onRemove={() => setLogoUrl(null)} />
          ) : (
            <div className="grid size-16 lg:size-[4.444vw] place-items-center rounded-md lg:rounded-[0.556vw] border border-dashed border-border text-[11px] lg:text-[0.764vw] text-muted-foreground">
              No logo
            </div>
          )}
          <ImageUpload folder="avatars" accept="image" onUpload={(r) => setLogoUrl(r.secureUrl)}>
            <span className="rounded-md lg:rounded-[0.556vw] border border-border bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium transition-colors hover:border-foreground/30">
              {logoUrl ? "Change logo" : "Upload logo"}
            </span>
          </ImageUpload>
        </div>
      </Field>

      <Field label="Company name">
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Lone Star Roofing Co."
          className="h-11 lg:h-[3.056vw]"
        />
      </Field>

      <Field label="About" hint="A line or two homeowners see on your profile.">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 600))}
          rows={3}
          placeholder="What your company takes pride in."
          className="min-h-24 lg:min-h-[6.667vw]"
        />
      </Field>

      <Field label="Years in business">
        <Input
          value={years}
          onChange={(e) => setYears(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          inputMode="numeric"
          placeholder="e.g. 12"
          className="h-11 lg:h-[3.056vw] max-w-[8rem] lg:max-w-[10vw]"
        />
      </Field>
    </EditDialog>
  )
}
