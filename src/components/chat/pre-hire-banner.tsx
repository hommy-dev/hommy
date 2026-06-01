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
    <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/20 px-4 py-1 text-[11px] text-muted-foreground">
      <Lock className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  )
}
