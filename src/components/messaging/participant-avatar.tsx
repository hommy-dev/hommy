import { cn } from '@/lib/utils'

/** Initials fallback derived from a name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/**
 * Round initials avatar on a muted tile. Flat — no ring, no shadow. (Logos can
 * be layered in later once remote image config is settled.) Pass `online` to
 * show a presence dot; omit it to render none.
 */
export function ParticipantAvatar({
  name,
  className,
  online,
}: {
  name: string
  className?: string
  online?: boolean
}) {
  const avatar = (
    <span
      className={cn(
        'grid size-9 lg:size-[2.5vw] shrink-0 place-items-center rounded-full bg-muted text-xs lg:text-[0.833vw] font-semibold text-muted-foreground select-none',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
  if (online === undefined) return avatar
  return (
    <span className="relative inline-flex shrink-0">
      {avatar}
      <span
        className={cn(
          'absolute bottom-0 right-0 size-2.5 lg:size-[0.694vw] rounded-full border-2 border-background',
          online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
        )}
      />
    </span>
  )
}
