"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateBusinessProfile } from "@/lib/actions/profile"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ImageUpload, UploadedImagePreview } from "@/components/ui/image-upload"

type Initial = {
  companyName: string
  bio: string
  logoUrl: string | null
  yearsInBusiness: number | null
}

export function CompanyProfileForm({
  initial,
  canManage,
}: {
  initial: Initial
  canManage: boolean
}) {
  const router = useRouter()
  const [companyName, setCompanyName] = useState(initial.companyName)
  const [bio, setBio] = useState(initial.bio)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [years, setYears] = useState(
    initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : "",
  )
  const [pending, start] = useTransition()

  const initialYears =
    initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : ""
  const dirty =
    companyName.trim() !== initial.companyName.trim() ||
    bio.trim() !== initial.bio.trim() ||
    logoUrl !== initial.logoUrl ||
    years.trim() !== initialYears

  function save() {
    start(async () => {
      const res = await updateBusinessProfile({
        companyName: companyName.trim(),
        bio: bio.trim(),
        logoUrl,
        yearsInBusiness: years.trim() === "" ? null : Number(years),
      })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Company saved", { type: "success" })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5 lg:space-y-[1.389vw]">
      <Field label="Company name">
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Lone Star Roofing Co."
          disabled={!canManage}
          className="h-11 lg:h-[3.056vw] max-w-md lg:max-w-[28vw]"
        />
      </Field>

      <Field label="About" hint="A line or two homeowners will see on your profile.">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 600))}
          rows={3}
          disabled={!canManage}
          placeholder="What your company takes pride in."
          className="min-h-24 lg:min-h-[6.667vw] max-w-xl lg:max-w-[36vw]"
        />
      </Field>

      <Field label="Years in business">
        <Input
          value={years}
          onChange={(e) => setYears(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          inputMode="numeric"
          placeholder="e.g. 12"
          disabled={!canManage}
          className="h-11 lg:h-[3.056vw] max-w-[8rem] lg:max-w-[10vw]"
        />
      </Field>

      <Field label="Logo">
        <div className="flex items-center gap-4 lg:gap-[1.111vw]">
          {logoUrl ? (
            <UploadedImagePreview
              url={logoUrl}
              onRemove={canManage ? () => setLogoUrl(null) : () => {}}
            />
          ) : (
            <div className="grid size-20 lg:size-[5.556vw] place-items-center rounded-md lg:rounded-[0.556vw] border border-dashed border-border text-xs lg:text-[0.833vw] text-muted-foreground">
              No logo
            </div>
          )}
          {canManage ? (
            <ImageUpload
              folder="avatars"
              accept="image"
              onUpload={(r) => setLogoUrl(r.secureUrl)}
            >
              <span className="rounded-md lg:rounded-[0.556vw] border border-border bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium transition-colors hover:border-foreground/30">
                {logoUrl ? "Change logo" : "Upload logo"}
              </span>
            </ImageUpload>
          ) : null}
        </div>
      </Field>

      {canManage ? (
        <div className="flex justify-end pt-1 lg:pt-[0.278vw]">
          <Button
            onClick={save}
            disabled={!dirty || pending}
            size="lg"
            className="font-semibold"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : (
        <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
          Only owners and admins can edit the company profile.
        </p>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="text-xs lg:text-[0.833vw] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
