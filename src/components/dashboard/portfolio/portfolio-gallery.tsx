"use client"

import { useState } from "react"
import type { PortfolioProject } from "@/lib/data/portfolio"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageZoom } from "@/components/kibo-ui/image-zoom"
import { BeforeAfter } from "./before-after"

// Public, read-only case-study gallery for the contractor profile. Cards open a
// viewer that renders single images (zoomable) and before/after sliders.
export function PortfolioGallery({ items }: { items: PortfolioProject[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
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

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:gap-[1.111vw] lg:grid-cols-3">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenId(p.id)}
            className="group overflow-hidden rounded-lg lg:rounded-[0.694vw] border border-border text-left transition-colors hover:border-foreground/30"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              {p.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.coverImageUrl}
                  alt=""
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="p-2.5 lg:p-[0.694vw]">
              <p className="truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
                {p.title}
              </p>
              {p.location ? (
                <p className="truncate text-xs lg:text-[0.833vw] text-muted-foreground">
                  {p.location}
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {open ? (
        <Dialog open onOpenChange={(o) => !o && setOpenId(null)}>
          <DialogContent className="sm:max-w-xl lg:max-w-[42vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{open.title}</DialogTitle>
              {open.location ? (
                <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
                  {open.location}
                </p>
              ) : null}
            </DialogHeader>

            {open.description ? (
              <p className="whitespace-pre-line text-sm lg:text-[0.972vw] leading-relaxed text-foreground/80">
                {open.description}
              </p>
            ) : null}

            <div className="space-y-4 lg:space-y-[1.111vw]">
              {open.images.map((m) =>
                m.kind === "before_after" && m.beforeUrl ? (
                  <BeforeAfter
                    key={m.id}
                    before={m.beforeUrl}
                    after={m.imageUrl}
                    mode="hover"
                    className="overflow-hidden rounded-md lg:rounded-[0.556vw]"
                  />
                ) : (
                  <figure key={m.id} className="space-y-1.5 lg:space-y-[0.417vw]">
                    <ImageZoom>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.imageUrl}
                        alt={m.caption ?? ""}
                        className="w-full rounded-md lg:rounded-[0.556vw]"
                      />
                    </ImageZoom>
                    {m.caption ? (
                      <figcaption className="text-xs lg:text-[0.833vw] text-muted-foreground">
                        {m.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ),
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
