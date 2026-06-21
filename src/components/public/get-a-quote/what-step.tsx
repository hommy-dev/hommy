"use client"

import { Icon } from "@/components/ui/icon"
import { Textarea } from "@/components/ui/textarea"
import { OptionCard } from "@/components/ui/option-card"
import { ImageUpload } from "@/components/ui/image-upload"
import { MAX_LEAD_PHOTOS, NOT_SURE_SUBTYPE } from "@/lib/leads/subtype"
import { SUBTYPE_META, URGENCY } from "./constants"
import { WizardField, WizardStep } from "./wizard-parts"

const NOTES_MAX = 1000

export function WhatStep({
  subtypes,
  selectedSubtypes,
  onToggleSubtype,
  urgency,
  onUrgencyChange,
  notes,
  onNotesChange,
  photos,
  onPhotosChange,
}: {
  subtypes: string[]
  selectedSubtypes: string[]
  onToggleSubtype: (s: string) => void
  urgency: string
  onUrgencyChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  photos: string[]
  onPhotosChange: (photos: string[]) => void
}) {
  const remaining = MAX_LEAD_PHOTOS - photos.length
  return (
    <WizardStep
      title="What's going on with your roof?"
      sub="Pick all that apply — or choose “Not sure” and a roofer will take a look."
    >
      <WizardField label="Type of work">
        <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
          {subtypes.map((s) => (
            <OptionCard
              key={s}
              label={s}
              icon={SUBTYPE_META[s]?.icon}
              desc={SUBTYPE_META[s]?.desc}
              active={selectedSubtypes.includes(s)}
              onClick={() => onToggleSubtype(s)}
            />
          ))}
          <OptionCard
            label={NOT_SURE_SUBTYPE}
            icon={SUBTYPE_META[NOT_SURE_SUBTYPE]?.icon}
            desc={SUBTYPE_META[NOT_SURE_SUBTYPE]?.desc}
            active={selectedSubtypes.includes(NOT_SURE_SUBTYPE)}
            onClick={() => onToggleSubtype(NOT_SURE_SUBTYPE)}
          />
        </div>
      </WizardField>

      <WizardField label="How soon do you need it?">
        <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
          {URGENCY.map((u) => (
            <OptionCard
              key={u.value}
              label={u.label}
              desc={u.desc}
              icon={u.icon}
              active={urgency === u.value}
              onClick={() => onUrgencyChange(u.value)}
            />
          ))}
        </div>
      </WizardField>

      <WizardField label="Describe the job">
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value.slice(0, NOTES_MAX))}
          placeholder="e.g. There's a leak over the garage that started after last week's storm. Some shingles are missing too."
          rows={4}
          className="min-h-32 lg:min-h-[8.889vw] bg-card text-left"
        />
        {notes.length > 0 && (
          <p className="text-right text-[11px] lg:text-[0.764vw] text-foreground/40">
            {notes.length}/{NOTES_MAX}
          </p>
        )}
      </WizardField>

      <WizardField
        label="Add photos (optional)"
        hint="A few shots of the problem help roofers size up the job and quote faster. You can add up to 8."
      >
        <div className="space-y-3 lg:space-y-[0.833vw]">
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 lg:gap-[0.556vw] sm:grid-cols-4">
              {photos.map((url, i) => (
                <div
                  key={url}
                  className="group relative aspect-square overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Job photo ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onPhotosChange(photos.filter((_, x) => x !== i))}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 lg:right-[0.417vw] lg:top-[0.417vw] grid size-7 lg:size-[1.944vw] place-items-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity hover:bg-foreground group-focus-within:opacity-100 group-hover:opacity-100"
                  >
                    <Icon name="delete" className="size-4 lg:size-[1.111vw]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {remaining > 0 ? (
            <ImageUpload
              folder="jobs"
              accept="image"
              maxFiles={remaining}
              className="w-full"
              onUpload={(r) => onPhotosChange([...photos, r.secureUrl])}
            >
              <span className="flex w-full cursor-pointer items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-4 lg:py-[1.111vw] text-sm lg:text-[0.972vw] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
                <Icon name="camera" className="size-4 lg:size-[1.111vw]" />
                {photos.length ? "Add more photos" : "Add photos"}
              </span>
            </ImageUpload>
          ) : (
            <p className="text-xs lg:text-[0.833vw] text-foreground/50">
              That's the max of 8 photos. Remove one to swap it out.
            </p>
          )}
        </div>
      </WizardField>
    </WizardStep>
  )
}
