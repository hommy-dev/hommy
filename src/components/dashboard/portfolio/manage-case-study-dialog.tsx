"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updatePortfolioProject,
  deletePortfolioProject,
} from "@/lib/actions/portfolio"
import type { PortfolioProject } from "@/lib/data/portfolio"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { WorkTypeSelect } from "./work-type-select"
import { GooglePlacesInput } from "@/components/ui/google-places-input"
import { showToast } from "@/components/ui/toast"
import { Field } from "@/components/dashboard/settings/edit-dialog"
import { PortfolioMedia } from "./portfolio-media"

export function ManageCaseStudyDialog({
  project,
  subtypes,
  open,
  onOpenChange,
}: {
  project: PortfolioProject
  subtypes: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description ?? "")
  const [subtype, setSubtype] = useState(project.serviceSubtype ?? "")
  const [location, setLocation] = useState(project.location ?? "")
  const [published, setPublished] = useState(project.isPublished)
  const [savingDetails, startSave] = useTransition()
  const [pending, startAction] = useTransition()

  // Keep any legacy value that isn't in the current roofing subtypes selectable.
  const subtypeOptions =
    project.serviceSubtype && !subtypes.includes(project.serviceSubtype)
      ? [...subtypes, project.serviceSubtype]
      : subtypes

  const dirty =
    title.trim() !== project.title ||
    description.trim() !== (project.description ?? "") ||
    subtype.trim() !== (project.serviceSubtype ?? "") ||
    location.trim() !== (project.location ?? "")

  function saveDetails() {
    startSave(async () => {
      const res = await updatePortfolioProject({
        id: project.id,
        title: title.trim(),
        description: description.trim(),
        serviceSubtype: subtype.trim(),
        location: location.trim(),
      })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Details saved", { type: "success" })
      router.refresh()
    })
  }

  function togglePublish(next: boolean) {
    setPublished(next)
    startAction(async () => {
      const res = await updatePortfolioProject({ id: project.id, isPublished: next })
      if (!res.success) {
        setPublished(!next)
        showToast(res.error, { type: "error" })
        return
      }
      router.refresh()
    })
  }

  function remove() {
    startAction(async () => {
      const res = await deletePortfolioProject(project.id)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Case study deleted", { type: "success" })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] flex-col gap-0 lg:gap-0 overflow-hidden p-0 lg:p-0 sm:max-w-2xl lg:max-w-[52vw]">
        {/* Fixed header */}
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 lg:px-[1.7vw] lg:pt-[1.5vw]">
          <DialogTitle>Case study</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="scrollbar-thin flex-1 space-y-6 lg:space-y-[1.667vw] overflow-y-auto px-6 py-6 lg:px-[1.7vw] lg:py-[1.667vw]">
          {/* Details */}
          <div className="space-y-4 lg:space-y-[1.111vw]">
            <Field label="Title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 lg:h-[3.056vw]"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                rows={3}
                className="min-h-24 lg:min-h-[6.667vw]"
              />
            </Field>
            <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
              <Field label="Type of work">
                <WorkTypeSelect
                  value={subtype}
                  onValueChange={setSubtype}
                  options={subtypeOptions}
                />
              </Field>
              <Field label="Location">
                <GooglePlacesInput
                  value={location}
                  mode="cities"
                  placeholder="City or town"
                  onPlaceSelect={(p) =>
                    setLocation(
                      [p.city, p.state].filter(Boolean).join(", ") ||
                        p.formattedAddress,
                    )
                  }
                  className="h-11 lg:h-[3.056vw] bg-card text-left"
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={saveDetails}
                disabled={!dirty || savingDetails}
                className="font-semibold"
              >
                {savingDetails ? "Saving…" : "Save details"}
              </Button>
            </div>
          </div>

          {/* Photos */}
          <div className="border-t border-border pt-5 lg:pt-[1.389vw]">
            <h3 className="mb-3 lg:mb-[0.833vw] text-sm lg:text-[0.972vw] font-semibold">
              Photos
            </h3>
            <PortfolioMedia
              projectId={project.id}
              initial={project.images}
              cover={project.coverImageUrl}
            />
          </div>

        </div>

        {/* Fixed footer: publish + delete */}
        <div className="flex shrink-0 items-center justify-between gap-3 lg:gap-[0.833vw] border-t border-border px-6 py-4 lg:px-[1.7vw] lg:py-[1.111vw]">
          <label className="flex items-center gap-2.5 lg:gap-[0.694vw] text-sm lg:text-[0.972vw] font-medium">
            <Switch checked={published} onCheckedChange={togglePublish} disabled={pending} />
            {published ? "Published" : "Draft"}
          </label>
          <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
            Delete case study
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
