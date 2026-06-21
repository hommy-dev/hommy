"use client"

// One unified "Recent work" gallery for the public profile. Merges the
// contractor's case-study photos and their imported Google photos into a single
// grid + viewer, so a homeowner just sees the company's work — not where each
// photo came from. Each tile is a big thumbnail with a small caption line;
// clicking opens the shared zoomable prev/next lightbox.

import { useState } from "react"
import type { PortfolioProject } from "@/lib/data/portfolio"
import type { ExternalMediaItem } from "@/lib/data/integrations"
import { EmptyState } from "@/components/ui/empty-state"
import { MediaLightbox, type LightboxSlide } from "@/components/ui/media-lightbox"

type WorkSlide = LightboxSlide & { thumb: string; smallLine: string | null }

function buildSlides(
  portfolio: PortfolioProject[],
  google: ExternalMediaItem[],
): WorkSlide[] {
  const slides: WorkSlide[] = []

  // Case-study photos first (the contractor's curated work).
  for (const project of portfolio) {
    for (const img of project.images) {
      slides.push({
        id: img.id,
        url: img.imageUrl,
        beforeUrl: img.beforeUrl,
        kind: img.kind,
        thumb: img.imageUrl,
        smallLine: project.title,
        title: project.title,
        subtitle: project.location,
        description: project.description,
        caption: img.caption,
      })
    }
  }

  // Imported Google photos. Attribution stays as the caption (Google's terms),
  // but there's no separate "from Google" label — it's all one body of work.
  for (const m of google) {
    slides.push({
      id: m.id,
      url: m.sourceUrl,
      thumb: m.sourceUrl,
      smallLine: m.attributionHtml,
      caption: m.attributionHtml,
    })
  }

  return slides
}

export function WorkGallery({
  portfolio,
  google,
}: {
  portfolio: PortfolioProject[]
  google: ExternalMediaItem[]
}) {
  const [index, setIndex] = useState<number | null>(null)
  const slides = buildSlides(portfolio, google)

  if (slides.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon="image-3"
        title="No work to show yet"
        description="This pro hasn't shared photos of past jobs yet."
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-[0.833vw]">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            className="group overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card text-left transition-colors hover:border-foreground/30"
          >
            <div className="aspect-4/3 overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- mix of portfolio + remote Google photos */}
              <img
                src={s.thumb}
                alt=""
                referrerPolicy="no-referrer"
                loading="lazy"
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            {s.smallLine ? (
              <p className="truncate px-2.5 py-2 lg:px-[0.694vw] lg:py-[0.556vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                {s.smallLine}
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
        />
      ) : null}
    </>
  )
}
