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
  bannerUrl: string | null
  yearsInBusiness: number | null
}

export function EditCompanyDialog({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [companyName, setCompanyName] = useState(initial.companyName)
  const [bio, setBio] = useState(initial.bio)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial.bannerUrl)
  const [years, setYears] = useState(
    initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : "",
  )

  function reset() {
    setCompanyName(initial.companyName)
    setBio(initial.bio)
    setLogoUrl(initial.logoUrl)
    setBannerUrl(initial.bannerUrl)
    setYears(initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : "")
  }

  async function save(): Promise<boolean> {
    const res = await updateBusinessProfile({
      companyName: companyName.trim(),
      bio: bio.trim(),
      logoUrl,
      bannerUrl,
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
      canSave={
        companyName.trim().length >= 2 &&
        years.trim() !== "" &&
        bio.trim().length >= 40
      }
      wide
    >
      <Field label="Cover banner" hint="A wide image shown across the top of your profile. ~1600×400 looks best.">
        <div className="space-y-2.5 lg:space-y-[0.694vw]">
          <div className="relative aspect-[4/1] w-full overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-muted">
            {bannerUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerUrl} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setBannerUrl(null)}
                  className="absolute right-2 lg:right-[0.556vw] top-2 lg:top-[0.556vw] rounded-full bg-background/85 px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-medium text-destructive shadow-sm transition-colors hover:bg-background"
                >
                  Remove
                </button>
              </>
            ) : (
              <div
                className="size-full bg-gradient-to-br from-primary/25 via-primary/10 to-secondary/20"
                aria-hidden="true"
              />
            )}
          </div>
          <ImageUpload folder="banners" accept="image" onUpload={(r) => setBannerUrl(r.secureUrl)}>
            <span className="inline-block rounded-md lg:rounded-[0.556vw] border border-border bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium transition-colors hover:border-foreground/30">
              {bannerUrl ? "Change banner" : "Upload banner"}
            </span>
          </ImageUpload>
        </div>
      </Field>

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

      <Field
        label="About"
        hint="Share your expertise, proudest work, and why customers should choose you."
      >
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 600))}
          rows={5}
          placeholder="e.g. Family-run since 2009, we specialize in storm-damage repairs and full roof replacements across the metro. Licensed and insured, with a 10-year workmanship warranty on every job. We show up on time and leave your property cleaner than we found it."
          className="min-h-32 lg:min-h-[9vw]"
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
