import { Suspense } from "react"
import type { Metadata } from "next"

import { getRequiredUser } from "@/lib/auth/session"
import { getFeatureInterest } from "@/lib/data/feature-interest"
import { FEATURES } from "@/components/dashboard/coming-next/features"
import { FeatureCard } from "@/components/dashboard/coming-next/feature-card"

export const metadata: Metadata = { title: "What's next" }

export default function ComingNextPage() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight sm:text-3xl">
          What we&rsquo;re building next
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] max-w-2xl lg:max-w-[30vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          A look at what&rsquo;s coming to Hommy. Tap <strong>Notify me</strong> on the
          ones you want most. The features with the most interest are the ones we
          build first.
        </p>
      </header>

      <Suspense fallback={<FeatureGridSkeleton />}>
        <FeatureGrid />
      </Suspense>
    </div>
  )
}

async function FeatureGrid() {
  await getRequiredUser("contractor")
  const { mine } = await getFeatureInterest()
  const mineSet = new Set(mine)

  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 xl:grid-cols-3">
      {FEATURES.map((f) => (
        <FeatureCard key={f.key} feature={f} voted={mineSet.has(f.key)} />
      ))}
    </div>
  )
}

function FeatureGridSkeleton() {
  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 xl:grid-cols-3">
      {FEATURES.map((f) => (
        <div
          key={f.key}
          className="flex flex-col overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card"
        >
          <div className="h-56 lg:h-[15.556vw] animate-pulse bg-muted/60" />
          <div className="space-y-2 lg:space-y-[0.556vw] p-4 lg:p-[1.389vw]">
            <div className="h-4 lg:h-[1.111vw] w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 lg:h-[0.833vw] w-full animate-pulse rounded bg-muted/70" />
            <div className="h-3 lg:h-[0.833vw] w-4/5 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  )
}
