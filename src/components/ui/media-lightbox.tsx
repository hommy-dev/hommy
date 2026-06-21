"use client"

// A clean full-screen media viewer: one image at a time (zoomable via ImageZoom),
// icon prev/next navigation, a counter, and a tidy title/description/caption area.
// Replaces stacked-image dialogs. Before/after slides render the comparison slider.

import { useCallback, useEffect } from "react"
import { Icon } from "@/components/ui/icon"
import { ImageZoom } from "@/components/kibo-ui/image-zoom"
import { BeforeAfter } from "@/components/dashboard/portfolio/before-after"
import { cn } from "@/lib/utils"

export type LightboxSlide = {
  id: string
  url: string
  beforeUrl?: string | null
  kind?: "single" | "before_after"
  caption?: string | null
  /** Per-slide overrides — take precedence over the component-level props.
   *  Used by mixed galleries where each slide has its own title/description. */
  title?: string | null
  subtitle?: string | null
  description?: string | null
}

export function MediaLightbox({
  slides,
  index,
  onIndexChange,
  onClose,
  title,
  subtitle,
  description,
}: {
  slides: LightboxSlide[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
  title?: string | null
  subtitle?: string | null
  description?: string | null
}) {
  const count = slides.length
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + count) % count),
    [index, count, onIndexChange],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [go, onClose])

  const slide = slides[index]
  if (!slide) return null

  const slideTitle = slide.title ?? title
  const slideSubtitle = slide.subtitle ?? subtitle
  const slideDescription = slide.description ?? description

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md">
      {/* Top bar — title / subtitle + close */}
      <div className="flex items-start justify-between gap-4 lg:gap-[1.111vw] p-4 lg:p-[1.389vw]">
        <div className="min-w-0">
          {slideTitle ? (
            <p className="truncate font-sebenta text-lg lg:text-[1.25vw] font-semibold text-foreground">
              {slideTitle}
            </p>
          ) : null}
          {slideSubtitle ? (
            <p className="truncate text-sm lg:text-[0.903vw] text-muted-foreground">{slideSubtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-full flex items-center justify-center p-2 lg:p-[0.556vw] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon name="close" className="size-5 lg:size-[1.389vw]" />
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 lg:px-[7vw]">
        {count > 1 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-3 lg:left-[2vw] top-1/2 z-10 flex size-10 lg:size-[2.778vw] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-foreground transition-colors hover:bg-card"
          >
            <Icon name="arrow-left" className="size-5 lg:size-[1.389vw]" />
          </button>
        ) : null}

        {slide.kind === "before_after" && slide.beforeUrl ? (
          <BeforeAfter
            before={slide.beforeUrl}
            after={slide.url}
            mode="drag"
            className="w-[80vw] max-w-2xl lg:w-[52vw] lg:max-w-[52vw] max-h-[72vh] overflow-hidden rounded-lg lg:rounded-[0.694vw]"
          />
        ) : (
          <ImageZoom>
            {/* eslint-disable-next-line @next/next/no-img-element -- viewer image */}
            <img
              src={slide.url}
              alt={slide.caption ?? ""}
              referrerPolicy="no-referrer"
              className="max-h-[72vh] w-auto max-w-full rounded-lg lg:rounded-[0.694vw] object-contain"
            />
          </ImageZoom>
        )}

        {count > 1 ? (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-3 lg:right-[2vw] top-1/2 z-10 flex size-10 lg:size-[2.778vw] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-foreground transition-colors hover:bg-card"
          >
            <Icon name="arrow-right" className="size-5 lg:size-[1.389vw]" />
          </button>
        ) : null}
      </div>

      {/* Caption / description / counter */}
      <div className="space-y-1 lg:space-y-[0.278vw] p-4 lg:p-[1.389vw]">
        {slideDescription ? (
          <p className="mx-auto max-w-2xl lg:max-w-[44vw] text-center text-sm lg:text-[0.903vw] leading-relaxed text-foreground/80 line-clamp-2">
            {slideDescription}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-3 lg:gap-[0.833vw] text-xs lg:text-[0.764vw] text-muted-foreground">
          {slide.caption ? <span className="truncate">{slide.caption}</span> : null}
          {count > 1 ? (
            <span className={cn("shrink-0 tabular-nums", slide.caption && "border-l border-border pl-3 lg:pl-[0.833vw]")}>
              {index + 1} / {count}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
