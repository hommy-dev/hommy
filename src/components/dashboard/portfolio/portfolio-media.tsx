"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addPortfolioImage, removePortfolioImage } from "@/lib/actions/portfolio"
import type { PortfolioImage } from "@/lib/data/portfolio"
import { ImageUpload } from "@/components/ui/image-upload"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { showToast } from "@/components/ui/toast"
import { BeforeAfter } from "./before-after"

export function PortfolioMedia({
  projectId,
  initial,
}: {
  projectId: string
  initial: PortfolioImage[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<PortfolioImage[]>(initial)
  const [before, setBefore] = useState<string | null>(null)
  const [after, setAfter] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function addSingle(url: string) {
    setBusy(true)
    const res = await addPortfolioImage({ projectId, kind: "single", imageUrl: url })
    setBusy(false)
    if (!res.success || !res.data) {
      showToast(res.success ? "Could not add image." : res.error, { type: "error" })
      return
    }
    setItems((i) => [...i, res.data!])
    router.refresh()
  }

  async function addPair() {
    if (!before || !after) return
    setBusy(true)
    const res = await addPortfolioImage({
      projectId,
      kind: "before_after",
      imageUrl: after,
      beforeUrl: before,
    })
    setBusy(false)
    if (!res.success || !res.data) {
      showToast(res.success ? "Could not add." : res.error, { type: "error" })
      return
    }
    setItems((i) => [...i, res.data!])
    setBefore(null)
    setAfter(null)
    router.refresh()
  }

  async function remove(id: string) {
    setBusy(true)
    const res = await removePortfolioImage(id)
    setBusy(false)
    if (!res.success) {
      showToast(res.error, { type: "error" })
      return
    }
    setItems((i) => i.filter((x) => x.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:gap-[0.833vw] sm:grid-cols-3">
          {items.map((m) => (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border"
            >
              {m.kind === "before_after" && m.beforeUrl ? (
                <BeforeAfter before={m.beforeUrl} after={m.imageUrl} mode="hover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(m.id)}
                disabled={busy}
                aria-label="Remove image"
                className="absolute right-1.5 lg:right-[0.417vw] top-1.5 lg:top-[0.417vw] z-50 grid size-7 lg:size-[1.944vw] place-items-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity hover:bg-foreground group-hover:opacity-100"
              >
                <Icon name="delete" className="size-4 lg:size-[1.111vw]" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add single photo */}
      <ImageUpload folder="portfolio" accept="image" className="w-full" onUpload={(r) => addSingle(r.secureUrl)}>
        <span className="flex w-full cursor-pointer items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-4 lg:py-[1.111vw] text-sm lg:text-[0.972vw] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
          <Icon name="plus" className="size-4 lg:size-[1.111vw]" />
          Add photo
        </span>
      </ImageUpload>

      {/* Add before/after pair */}
      <div className="space-y-3 lg:space-y-[0.833vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-3 lg:p-[0.833vw]">
        <p className="text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider text-muted-foreground">
          Before / after
        </p>
        <div className="grid grid-cols-2 gap-3 lg:gap-[0.833vw]">
          <UploadSlot label="Before" url={before} onUpload={setBefore} onClear={() => setBefore(null)} />
          <UploadSlot label="After" url={after} onUpload={setAfter} onClear={() => setAfter(null)} />
        </div>
        <Button size="sm" onClick={addPair} disabled={!before || !after || busy} className="font-semibold">
          Add before/after
        </Button>
      </div>
    </div>
  )
}

function UploadSlot({
  label,
  url,
  onUpload,
  onClear,
}: {
  label: string
  url: string | null
  onUpload: (url: string) => void
  onClear: () => void
}) {
  if (url) {
    return (
      <div className="relative overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="aspect-[4/3] w-full object-cover" />
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-foreground/70 px-2 py-0.5 text-[11px] lg:text-[0.764vw] font-medium text-background">
          {label}
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${label}`}
          className="absolute right-1.5 top-1.5 grid size-6 lg:size-[1.667vw] place-items-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
        >
          <Icon name="delete" className="size-3.5 lg:size-[0.972vw]" />
        </button>
      </div>
    )
  }
  return (
    <ImageUpload folder="portfolio" accept="image" className="w-full" onUpload={(r) => onUpload(r.secureUrl)}>
      <span className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1 lg:gap-[0.278vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border text-xs lg:text-[0.833vw] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
        <Icon name="plus" className="size-4 lg:size-[1.111vw]" />
        {label}
      </span>
    </ImageUpload>
  )
}
