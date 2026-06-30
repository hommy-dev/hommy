"use client"

// Editor for the company intro video. Two ways in (the user can use either):
// upload a short clip (hosted on Cloudinary) OR paste a YouTube/Vimeo link.
// Both resolve to a single stored URL; the player figures out how to render it.

import { useState } from "react"
import { ImageUpload } from "@/components/ui/image-upload"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { showToast } from "@/components/ui/toast"
import { IntroVideo } from "@/components/dashboard/profile/intro-video"
import { isEmbeddableVideoLink, cloudinaryVideoPoster } from "@/lib/video"

/** ~100MB — Cloudinary's unsigned video ceiling; keep clips short anyway. */
const MAX_VIDEO_BYTES = 104_857_600

export function IntroVideoField({
  url,
  posterUrl,
  companyName,
  onChange,
}: {
  url: string | null
  posterUrl: string | null
  companyName: string
  onChange: (url: string | null, posterUrl: string | null) => void
}) {
  const [link, setLink] = useState("")

  if (url) {
    return (
      <div className="space-y-3 lg:space-y-[0.833vw]">
        <div className="max-w-md lg:max-w-[28vw]">
          <IntroVideo url={url} posterUrl={posterUrl} companyName={companyName} />
        </div>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="text-sm lg:text-[0.972vw] font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          Remove video
        </button>
      </div>
    )
  }

  function addLink() {
    const v = link.trim()
    if (!v) return
    if (!isEmbeddableVideoLink(v)) {
      showToast("Paste a YouTube or Vimeo link.", { type: "error" })
      return
    }
    onChange(v, null)
    setLink("")
  }

  return (
    <div className="space-y-3 lg:space-y-[0.833vw]">
      {/* TDO In V2 we will show this */}
      {/* <ImageUpload
        folder="videos"
        accept="video"
        maxFileSize={MAX_VIDEO_BYTES}
        className="w-full [&>button]:block [&>button]:w-full"
        onUpload={(r) => onChange(r.secureUrl, cloudinaryVideoPoster(r.secureUrl))}
      >
        <span className="flex w-full cursor-pointer items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-4 lg:py-[1.111vw] text-sm lg:text-[0.972vw] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
          <Icon name="video" className="size-4 lg:size-[1.111vw]" />
          Upload a video
        </span>
      </ImageUpload> */}

      {/* <div className="flex items-center gap-3 lg:gap-[0.833vw] text-xs lg:text-[0.833vw] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or paste a link
        <span className="h-px flex-1 bg-border" />
      </div> */}

      <div className="flex gap-2 lg:gap-[0.556vw]">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addLink()
            }
          }}
          placeholder="YouTube or Vimeo URL"
          className="h-11 lg:h-[3.056vw]"
        />
        <Button type="button" size="lg" onClick={addLink} disabled={!link.trim()}>
          Add video
        </Button>
      </div>
    </div>
  )
}
