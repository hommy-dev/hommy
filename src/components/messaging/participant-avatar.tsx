import { cn } from '@/lib/utils'

/** Initials fallback derived from a name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/**
 * Square, lightly-rounded initials avatar on a muted tile. Flat — no ring, no
 * shadow. (Logos can be layered in later once remote image config is settled.)
 */
export function ParticipantAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'grid size-9 lg:size-[2.5vw] shrink-0 place-items-center rounded-md lg:rounded-[0.556vw] bg-muted text-xs lg:text-[0.833vw] font-semibold text-muted-foreground select-none',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
