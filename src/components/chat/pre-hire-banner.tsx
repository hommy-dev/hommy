import { Lock } from 'lucide-react'

/**
 * Tiny single-line pre-hire strip. Compressed from the previous 2-line
 * banner — just a small lock icon + short label so it doesn't steal
 * vertical space from the thread.
 */
export function PreHireBanner({ viewer }: { viewer: 'homeowner' | 'contractor' }) {
  const label =
    viewer === 'homeowner'
      ? 'Private pre-hire chat · keep contact info off-platform'
      : 'Pre-hire chat · reply once the homeowner writes · stay on-platform'
  return (
    <div className="flex items-center gap-1.5 lg:gap-[0.417vw] border-b border-border/60 bg-muted/20 px-4 lg:px-[1.111vw] py-1 lg:py-[0.278vw] text-[11px] lg:text-[0.764vw] text-muted-foreground">
      <Lock className="size-3 lg:size-[0.833vw] shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  )
}
