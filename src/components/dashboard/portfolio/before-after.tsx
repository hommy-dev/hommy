"use client"

import {
  Comparison,
  ComparisonHandle,
  ComparisonItem,
} from "@/components/kibo-ui/comparison"
import { cn } from "@/lib/utils"

// Before/after slider. The `Comparison` clip convention: position="right" shows
// the LEFT side, position="left" shows the RIGHT side — so before goes "right"
// and after goes "left" (drag right to reveal the finished work).
export function BeforeAfter({
  before,
  after,
  mode = "drag",
  className,
}: {
  before: string
  after: string
  mode?: "hover" | "drag"
  className?: string
}) {
  return (
    <Comparison mode={mode} className={cn("aspect-[4/3] w-full", className)}>
      <ComparisonItem position="right">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Before" className="size-full object-cover" />
        <span className="absolute bottom-2 left-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[11px] lg:text-[0.764vw] font-medium text-background">
          Before
        </span>
      </ComparisonItem>
      <ComparisonItem position="left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="After" className="size-full object-cover" />
        <span className="absolute right-2 bottom-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[11px] lg:text-[0.764vw] font-medium text-background">
          After
        </span>
      </ComparisonItem>
      <ComparisonHandle />
    </Comparison>
  )
}
