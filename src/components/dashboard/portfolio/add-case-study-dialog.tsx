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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GooglePlacesInput } from "@/components/ui/google-places-input"
import { ImageUpload } from "@/components/ui/image-upload"
import { Icon } from "@/components/ui/icon"
import { EditDialog, Field } from "@/components/dashboard/settings/edit-dialog"

export function AddCaseStudyDialog({ subtypes }: { subtypes: string[] }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [subtype, setSubtype] = useState("")
  const [location, setLocation] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
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

    // Attach the uploaded photos in order — the first becomes the cover.
    const projectId = res.data.id
    for (const url of photos) {
      const r = await addPortfolioImage({ projectId, kind: "single", imageUrl: url })
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
          <Select value={subtype} onValueChange={setSubtype}>
            <SelectTrigger className="h-11 lg:h-[3.056vw] w-full rounded-md lg:rounded-[0.556vw] border-input bg-card">
              <SelectValue placeholder="Select work type" />
            </SelectTrigger>
            <SelectContent>
              {subtypes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <Field label="Photos" hint="The first photo becomes the cover. Add more later, including before/after pairs.">
        <div className="space-y-2.5 lg:space-y-[0.694vw]">
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 lg:gap-[0.556vw]">
              {photos.map((url, i) => (
                <div
                  key={url}
                  className="group relative aspect-[4/3] overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 lg:bottom-[0.417vw] lg:left-[0.417vw] rounded-full bg-foreground/75 px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-medium text-background">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, x) => x !== i))}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 lg:right-[0.417vw] lg:top-[0.417vw] grid size-7 lg:size-[1.944vw] place-items-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity hover:bg-foreground group-hover:opacity-100"
                  >
                    <Icon name="delete" className="size-4 lg:size-[1.111vw]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <ImageUpload
            folder="portfolio"
            accept="image"
            maxFiles={10}
            className="w-full"
            onUpload={(r) => setPhotos((p) => [...p, r.secureUrl])}
          >
            <span className="flex w-full cursor-pointer items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-4 lg:py-[1.111vw] text-sm lg:text-[0.972vw] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
              <Icon name="plus" className="size-4 lg:size-[1.111vw]" />
              {photos.length ? "Add more photos" : "Add photos"}
            </span>
          </ImageUpload>
        </div>
      </Field>
    </EditDialog>
  )
}
