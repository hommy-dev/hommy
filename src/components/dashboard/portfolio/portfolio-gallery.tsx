"use client"

import { useState } from "react"
import type { PortfolioProject } from "@/lib/data/portfolio"
import { EmptyState } from "@/components/ui/empty-state"
import { MediaLightbox, type LightboxSlide } from "@/components/ui/media-lightbox"

// Public, read-only case-study gallery for the contractor profile. Cards show a
// big thumbnail + small title; opening one launches a clean prev/next viewer
// (zoomable images + before/after sliders), not a stacked dialog.
export function PortfolioGallery({ items }: { items: PortfolioProject[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const open = items.find((p) => p.id === openId) ?? null

  if (items.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon="image-3"
        title="No work to show yet"
        description="This pro hasn't shared photos of past jobs yet."
      />
    )
  }

  const slides: LightboxSlide[] =
    open?.images.map((m) => ({
      id: m.id,
      url: m.imageUrl,
      beforeUrl: m.beforeUrl,
      kind: m.kind,
      caption: m.caption,
    })) ?? []

  function openProject(id: string) {
    setOpenId(id)
    setIndex(0)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-[0.833vw]">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openProject(p.id)}
            className="group overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card text-left transition-colors hover:border-foreground/30"
          >
            <div className="aspect-4/3 overflow-hidden bg-muted">
              {p.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.coverImageUrl}
                  alt=""
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="px-2.5 py-2 lg:px-[0.694vw] lg:py-[0.556vw]">
              <p className="truncate text-sm lg:text-[0.903vw] font-medium text-foreground">
                {p.title}
              </p>
              {p.location ? (
                <p className="truncate text-xs lg:text-[0.764vw] text-muted-foreground">
                  {p.location}
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {open && slides.length > 0 ? (
        <MediaLightbox
          slides={slides}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setOpenId(null)}
          title={open.title}
          subtitle={open.location}
          description={open.description}
        />
      ) : null}
    </>
  )
}
