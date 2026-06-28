"use client"

// One unified photo manager for a case study, used by BOTH the Add and Manage
// modals so they never drift. Mental model: "these are my photos." A single
// grid; the cover is just the marked tile; before/after is an opt-in kind of
// photo (a split-thumbnail tile), added from the same "Add" menu — not a
// separate always-open box. The parent owns persistence via the callbacks
// (staged in Add, live server calls in Manage); this component is pure UI.

import { useId, useRef, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ImageUpload } from "@/components/ui/image-upload"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { showToast } from "@/components/ui/toast"
import { uploadMultipleToCloudinary } from "@/lib/cloudinary/upload"

export type CasePhoto = {
  /** Stable React key: server id in Manage, the URL(s) in Add. */
  key: string
  kind: "single" | "before_after"
  /** The single image, or the "after" of a pair. This is what cover points at. */
  imageUrl: string
  beforeUrl?: string | null
}

const MAX_FILE_SIZE = 10_485_760 // 10MB

export function CaseStudyPhotos({
  items,
  coverUrl,
  onAddSingle,
  onAddPair,
  onRemove,
  onSetCover,
  busy = false,
  max,
}: {
  items: CasePhoto[]
  coverUrl: string | null
  onAddSingle: (url: string) => void
  onAddPair: (beforeUrl: string, afterUrl: string) => void
  onRemove: (item: CasePhoto) => void
  onSetCover: (item: CasePhoto) => void
  busy?: boolean
  max?: number
}) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pairOpen, setPairOpen] = useState(false)
  const [before, setBefore] = useState<string | null>(null)
  const [after, setAfter] = useState<string | null>(null)

  const atMax = max != null && items.length >= max
  const working = busy || uploading

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    let files = Array.from(list)
    if (max != null) {
      const room = Math.max(0, max - items.length)
      if (files.length > room) {
        files = files.slice(0, room)
        showToast(`A case study can have up to ${max} photos.`, { type: "error" })
      }
    }
    const oversized = files.some((f) => f.size > MAX_FILE_SIZE)
    files = files.filter((f) => f.size <= MAX_FILE_SIZE)
    if (oversized) showToast("Some files were over 10MB and were skipped.", { type: "error" })
    if (files.length === 0) return

    setUploading(true)
    try {
      const results = await uploadMultipleToCloudinary(files, "portfolio")
      results.forEach((r) => onAddSingle(r.secureUrl))
    } catch (err) {
      console.error("[CaseStudyPhotos] upload failed", err)
      showToast("Couldn't upload one or more photos. Please try again.", { type: "error" })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function addPair() {
    if (!before || !after) return
    onAddPair(before, after)
    setBefore(null)
    setAfter(null)
    setPairOpen(false)
  }

  function cancelPair() {
    setBefore(null)
    setAfter(null)
    setPairOpen(false)
  }

  return (
    <div className="space-y-3 lg:space-y-[0.833vw]">
      {/* Single hidden input, kept at root so the native picker isn't torn down
          when the Add menu closes. Opened via the menu item's <label htmlFor>. */}
      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 lg:gap-[0.556vw]">
          {items.map((item) => {
            const isCover = coverUrl != null && item.imageUrl === coverUrl
            return (
              <div
                key={item.key}
                className="group relative aspect-[4/3] overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-muted"
              >
                {item.kind === "before_after" && item.beforeUrl ? (
                  <div className="flex size-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.beforeUrl} alt="" className="h-full w-1/2 object-cover" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-1/2 border-l-2 border-background object-cover"
                    />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="size-full object-cover" />
                )}

                {/* Badges */}
                <div className="pointer-events-none absolute bottom-1.5 left-1.5 lg:bottom-[0.417vw] lg:left-[0.417vw] flex flex-wrap gap-1 lg:gap-[0.278vw]">
                  {isCover && (
                    <span className="rounded-full bg-foreground/80 px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-medium text-background">
                      Cover
                    </span>
                  )}
                  {item.kind === "before_after" && (
                    <span className="rounded-full bg-foreground/80 px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-medium text-background">
                      Before / after
                    </span>
                  )}
                </div>

                {/* Hover actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 lg:gap-[0.417vw] opacity-0 transition-opacity group-hover:bg-foreground/30 group-hover:opacity-100">
                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => onSetCover(item)}
                      disabled={working}
                      className="rounded-md lg:rounded-[0.556vw] bg-background/90 px-2.5 lg:px-[0.694vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-medium text-foreground shadow-sm transition-colors hover:bg-background disabled:opacity-60"
                    >
                      Set as cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    disabled={working}
                    aria-label="Remove photo"
                    className="grid size-7 lg:size-[1.944vw] place-items-center rounded-full bg-background/90 text-destructive shadow-sm transition-colors hover:bg-background disabled:opacity-60"
                  >
                    <Icon name="delete" className="size-4 lg:size-[1.111vw]" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Before/after composer (revealed from the Add menu) */}
      {pairOpen && (
        <div className="space-y-3 lg:space-y-[0.833vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-3 lg:p-[0.833vw]">
          <div className="flex items-center justify-between">
            <p className="text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider text-muted-foreground">
              Before / after pair
            </p>
            <button
              type="button"
              onClick={cancelPair}
              className="text-xs lg:text-[0.833vw] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:gap-[0.833vw]">
            <PairSlot label="Before" url={before} onUpload={setBefore} onClear={() => setBefore(null)} />
            <PairSlot label="After" url={after} onUpload={setAfter} onClear={() => setAfter(null)} />
          </div>
          <Button size="sm" onClick={addPair} disabled={!before || !after} className="font-semibold">
            Add pair
          </Button>
        </div>
      )}

      {/* Add menu */}
      {!atMax && !pairOpen && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={working}
            className="flex w-full cursor-pointer items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-4 lg:py-[1.111vw] text-sm lg:text-[0.972vw] font-medium text-muted-foreground outline-none transition-colors hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-foreground/30"
          >
            {working ? (
              <>
                <Spinner />
                Uploading…
              </>
            ) : (
              <>
                <Icon name="plus" className="size-4 lg:size-[1.111vw]" />
                {items.length ? "Add more" : "Add photos"}
                <Icon name="down" className="size-4 lg:size-[1.111vw]" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem asChild>
              <label htmlFor={inputId} className="cursor-pointer">
                <Icon name="image-3" className="size-4 lg:size-[1.111vw]" />
                Photos
              </label>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPairOpen(true)}>
              <Icon name="swap" className="size-4 lg:size-[1.111vw]" />
              Before &amp; after pair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function PairSlot({
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
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-foreground/75 px-2 py-0.5 text-[11px] lg:text-[0.764vw] font-medium text-background">
          {label}
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${label}`}
          className="absolute right-1.5 top-1.5 grid size-6 lg:size-[1.667vw] place-items-center rounded-full bg-background/90 text-destructive shadow-sm transition-colors hover:bg-background"
        >
          <Icon name="delete" className="size-3.5 lg:size-[0.972vw]" />
        </button>
      </div>
    )
  }
  return (
    <ImageUpload
      folder="portfolio"
      accept="image"
      className="w-full [&>button]:block [&>button]:w-full"
      onUpload={(r) => onUpload(r.secureUrl)}
    >
      <span className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1 lg:gap-[0.278vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border text-xs lg:text-[0.833vw] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
        <Icon name="plus" className="size-4 lg:size-[1.111vw]" />
        {label}
      </span>
    </ImageUpload>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="block size-4 lg:size-[1.111vw] animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70"
    />
  )
}
