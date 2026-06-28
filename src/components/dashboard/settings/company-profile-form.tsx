"use client"

// Inline editor for /contractor/settings/company — the page IS the form (no
// preview + modal). Owners edit logo, name, years, and about directly, with a
// Save/Discard footer that's live only when there are valid, unsaved changes.
// (Banner was dropped: the public profile no longer renders one.)

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateBusinessProfile } from "@/lib/actions/profile"
import { showToast } from "@/components/ui/toast"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload, UploadedImagePreview } from "@/components/ui/image-upload"
import { SettingsSection } from "./settings-section"
import { Field } from "./edit-dialog"

const BIO_MIN = 40
const BIO_MAX = 600

type Initial = {
  companyName: string
  bio: string
  logoUrl: string | null
  /** Preserved untouched — not editable here anymore, just passed back on save. */
  bannerUrl: string | null
  yearsInBusiness: number | null
}

type Values = {
  companyName: string
  bio: string
  logoUrl: string | null
  years: string
}

function toValues(i: Initial): Values {
  return {
    companyName: i.companyName,
    bio: i.bio,
    logoUrl: i.logoUrl,
    years: i.yearsInBusiness != null ? String(i.yearsInBusiness) : "",
  }
}

export function CompanyProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  // `saved` is the baseline we diff against; it advances after a successful save
  // so the footer goes quiet again without a remount.
  const [saved, setSaved] = useState<Values>(() => toValues(initial))
  const [v, setV] = useState<Values>(() => toValues(initial))

  const set = <K extends keyof Values>(key: K, val: Values[K]) =>
    setV((prev) => ({ ...prev, [key]: val }))

  const dirty =
    v.companyName !== saved.companyName ||
    v.bio !== saved.bio ||
    v.logoUrl !== saved.logoUrl ||
    v.years !== saved.years

  const nameError =
    v.companyName.trim().length > 0 && v.companyName.trim().length < 2
      ? "Enter your company name."
      : undefined
  const bioError =
    v.bio.trim().length > 0 && v.bio.trim().length < BIO_MIN
      ? `A little more detail — at least ${BIO_MIN} characters.`
      : undefined

  const valid =
    v.companyName.trim().length >= 2 &&
    v.years.trim() !== "" &&
    v.bio.trim().length >= BIO_MIN
  const canSave = dirty && valid && !pending

  function discard() {
    if (pending) return
    setV(saved)
  }

  function save() {
    if (!canSave) return
    start(async () => {
      const res = await updateBusinessProfile({
        companyName: v.companyName.trim(),
        bio: v.bio.trim(),
        logoUrl: v.logoUrl,
        bannerUrl: initial.bannerUrl,
        yearsInBusiness: v.years.trim() === "" ? null : Number(v.years),
      })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      setSaved({ ...v })
      showToast("Company saved", { type: "success" })
      router.refresh()
    })
  }

  return (
    <SettingsSection
      title="Company profile"
      description="What homeowners see about your business."
      action={
        <Link
          href="/contractor/profile"
          className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-medium text-primary hover:underline"
        >
          <Icon name="show" className="size-4 lg:size-[1.111vw]" />
          View public profile
        </Link>
      }
    >
      <div className="space-y-5 lg:space-y-[1.389vw]">
        <Field label="Logo">
          <div className="flex items-center gap-4 lg:gap-[1.111vw]">
            {v.logoUrl ? (
              <UploadedImagePreview url={v.logoUrl} />
            ) : (
              <div className="grid size-16 lg:size-[5vw] place-items-center rounded-full border border-dashed border-border text-[11px] lg:text-[0.764vw] text-muted-foreground">
                No logo
              </div>
            )}
            <div className="flex items-center gap-2 lg:gap-[0.556vw]">
              <ImageUpload
                folder="avatars"
                accept="image"
                onUpload={(r) => set("logoUrl", r.secureUrl)}
              >
                <span className="inline-block rounded-md lg:rounded-[0.556vw] border border-border bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium transition-colors hover:border-foreground/30">
                  {v.logoUrl ? "Change logo" : "Upload logo"}
                </span>
              </ImageUpload>
              {v.logoUrl ? (
                <button
                  type="button"
                  onClick={() => set("logoUrl", null)}
                  className="rounded-md lg:rounded-[0.556vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium text-muted-foreground transition-colors hover:text-destructive"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </Field>

        <Field label="Company name" error={nameError}>
          <Input
            value={v.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Lone Star Roofing Co."
            className="h-11 lg:h-[3.056vw]"
            aria-invalid={!!nameError}
          />
        </Field>

        <Field label="Years in business">
          <Input
            value={v.years}
            onChange={(e) => set("years", e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="e.g. 12"
            className="h-11 lg:h-[3.056vw] max-w-[8rem] lg:max-w-[10vw]"
          />
        </Field>

        <Field
          label="About"
          hint="Share your expertise, proudest work, and why customers should choose you."
          error={bioError}
        >
          <Textarea
            value={v.bio}
            onChange={(e) => set("bio", e.target.value.slice(0, BIO_MAX))}
            rows={5}
            placeholder="e.g. Family-run since 2009, we specialize in storm-damage repairs and full roof replacements across the metro. Licensed and insured, with a 10-year workmanship warranty on every job. We show up on time and leave your property cleaner than we found it."
            className="min-h-32 lg:min-h-[9vw]"
            aria-invalid={!!bioError}
          />
        </Field>
      </div>

      <div className="mt-6 lg:mt-[1.667vw] flex items-center justify-end gap-2 lg:gap-[0.556vw] border-t border-border pt-5 lg:pt-[1.389vw]">
        <Button variant="ghost" onClick={discard} disabled={!dirty || pending}>
          Discard
        </Button>
        <Button onClick={save} disabled={!canSave} className="font-semibold">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </SettingsSection>
  )
}
