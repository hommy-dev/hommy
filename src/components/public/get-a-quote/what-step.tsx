"use client"

import { Textarea } from "@/components/ui/textarea"
import { Icon } from "@/components/ui/icon"
import { OptionCard } from "@/components/ui/option-card"
import { LocalFilePicker, type StagedFile } from "@/components/ui/local-file-picker"
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
  photos: StagedFile[]
  onPhotosChange: (photos: StagedFile[]) => void
}) {
  return (
    <WizardStep
      title="What's going on with your roof?"
      sub="Pick all that apply, or choose “Not sure” and a roofer will take a look."
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
        label="Add photos (optional, but recommended)"
        hint="Roofers can quote faster and more accurately when they can see the problem. Add up to 8 (they upload when you post)."
      >
        <LocalFilePicker
          accept="image/*"
          maxFiles={MAX_LEAD_PHOTOS}
          maxSizeMB={15}
          files={photos}
          onFilesChange={onPhotosChange}
          label="Add photos"
          description="JPG, PNG or WebP."
        />
        {photos.length === 0 && (
          <div className="mt-2 lg:mt-[0.556vw] flex items-center gap-1.5 lg:gap-[0.417vw] text-[11px] lg:text-[0.764vw] text-primary">
            <Icon name="image" className="size-3.5 lg:size-[0.95vw] shrink-0" />
            Even one photo helps roofers give you a faster, more accurate quote.
          </div>
        )}
      </WizardField>
    </WizardStep>
  )
}
