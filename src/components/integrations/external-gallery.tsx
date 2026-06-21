"use client"

import { useState } from "react"
import type { ExternalMediaItem } from "@/lib/data/integrations"
import { MediaLightbox, type LightboxSlide } from "@/components/ui/media-lightbox"

/** Grid of imported (Google) photos — big thumbnail + small attribution. Opening
 *  one launches the shared zoomable prev/next viewer. v1 renders Google-hosted
 *  URLs directly (not re-hosted to Cloudinary). */
export function ExternalGallery({ items }: { items: ExternalMediaItem[] }) {
  const [index, setIndex] = useState<number | null>(null)
  if (items.length === 0) return null

  const slides: LightboxSlide[] = items.map((m) => ({
    id: m.id,
    url: m.sourceUrl,
    caption: m.caption ?? m.attributionHtml,
  }))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-[0.833vw]">
        {items.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setIndex(i)}
            className="group overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card text-left transition-colors hover:border-foreground/30"
          >
            <div className="aspect-4/3 overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Google photo */}
              <img
                src={m.sourceUrl}
                alt={m.caption ?? ""}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            {m.attributionHtml ? (
              <p className="truncate px-2.5 py-2 lg:px-[0.694vw] lg:py-[0.556vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                {m.attributionHtml}
              </p>
            ) : null}
          </button>
        ))}
      </div>

      {index !== null ? (
        <MediaLightbox
          slides={slides}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setIndex(null)}
          title="Photos from Google"
        />
      ) : null}
    </>
  )
}
