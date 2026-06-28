"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createPortfolioProject,
  addPortfolioImage,
} from "@/lib/actions/portfolio"
import { showToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WorkTypeSelect } from "./work-type-select"
import { GooglePlacesInput } from "@/components/ui/google-places-input"
import { CaseStudyPhotos, type CasePhoto } from "./case-study-photos"
import { MAX_IMAGES_PER_PROJECT } from "@/lib/portfolio/constants"
import { EditDialog, Field } from "@/components/dashboard/settings/edit-dialog"

export function AddCaseStudyDialog({ subtypes }: { subtypes: string[] }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [subtype, setSubtype] = useState("")
  const [location, setLocation] = useState("")
  const [photos, setPhotos] = useState<CasePhoto[]>([])
  const [pickerKey, setPickerKey] = useState(0)
  const [error, setError] = useState("")

  function reset() {
    setTitle("")
    setDescription("")
    setSubtype("")
    setLocation("")
    setPhotos([])
    setPickerKey((k) => k + 1)
    setError("")
  }

  async function save(): Promise<boolean> {
    setError("")
    const res = await createPortfolioProject({
      title: title.trim(),
      description: description.trim(),
      serviceSubtype: subtype.trim(),
      location: location.trim(),
    })
    if (!res.success || !res.data) {
      setError(res.success ? "Could not create case study." : res.error)
      return false
    }

    // Attach the staged photos in order — the first becomes the cover.
    const projectId = res.data.id
    for (const p of photos) {
      const r = await addPortfolioImage({
        projectId,
        kind: p.kind,
        imageUrl: p.imageUrl,
        beforeUrl: p.beforeUrl ?? null,
      })
      if (!r.success) showToast(r.error, { type: "error" })
    }

    showToast(
      photos.length ? "Case study created." : "Case study created. Add photos next.",
      { type: "success" },
    )
    router.refresh()
    return true
  }

  return (
    <EditDialog
      title="Add case study"
      description="Showcase a job you're proud of."
      triggerLabel="Add case study"
      triggerIcon="plus"
      onOpen={reset}
      onSave={save}
      canSave={title.trim().length >= 2}
      saveLabel="Create"
      wide
    >
      <Field label="Title" error={error}>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError("")
          }}
          placeholder="Full roof replacement in Dallas"
          className="h-11 lg:h-[3.056vw]"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          rows={6}
          placeholder="What the job involved, materials, timeline, anything notable."
          className="min-h-24 lg:min-h-[10vw]"
        />
      </Field>

      <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
        <Field label="Type of work">
          <WorkTypeSelect
            value={subtype}
            onValueChange={setSubtype}
            options={subtypes}
          />
        </Field>

        <Field label="Location">
          <GooglePlacesInput
            key={pickerKey}
            mode="cities"
            placeholder="City or town"
            onPlaceSelect={(p) =>
              setLocation(
                [p.city, p.state].filter(Boolean).join(", ") || p.formattedAddress,
              )
            }
            className="h-11 lg:h-[3.056vw] bg-card text-left"
          />
        </Field>
      </div>

      <Field label="Photos" hint="Add photos or before/after pairs. The cover is what homeowners see first.">
        <CaseStudyPhotos
          items={photos}
          coverUrl={photos[0]?.imageUrl ?? null}
          max={MAX_IMAGES_PER_PROJECT}
          onAddSingle={(url) =>
            setPhotos((p) => [...p, { key: url, kind: "single", imageUrl: url }])
          }
          onAddPair={(beforeUrl, afterUrl) =>
            setPhotos((p) => [
              ...p,
              {
                key: `ba:${beforeUrl}|${afterUrl}`,
                kind: "before_after",
                imageUrl: afterUrl,
                beforeUrl,
              },
            ])
          }
          onRemove={(item) => setPhotos((p) => p.filter((x) => x.key !== item.key))}
          onSetCover={(item) =>
            setPhotos((p) => [item, ...p.filter((x) => x.key !== item.key)])
          }
        />
      </Field>
    </EditDialog>
  )
}
