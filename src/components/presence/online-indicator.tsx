'use client'

import { cn } from '@/lib/utils'
import { useIsUserOnline } from './presence-store'

type Variant = 'dot' | 'label' | 'dot-label'

type Props = {
  userId: string | null | undefined
  /** ISO timestamp of the user's last `heartbeatAction` write. */
  lastSeenAt?: string | null
  /** "dot" renders a green dot only; "label" the text; "dot-label" both. */
  variant?: Variant
  className?: string
  /** When true, shows nothing if user is offline and no lastSeenAt. */
  hideWhenUnknown?: boolean
}

/**
 * Reusable presence indicator. Works anywhere in the authenticated tree:
 * chat sidebar avatars, lead cards, contractor profile cards, thread
 * header, admin dashboards.
 *
 *   • "Online now" state comes from the live Supabase Presence store
 *     (<PlatformPresenceHydrator> must be mounted — it is at both root
 *     dashboard layouts).
 *   • Offline "Active 5m ago" state comes from users.last_seen_at,
 *     passed as a prop. Callers fetch it once on server render and let
 *     this component format it reactively.
 *
 * Uses the store's useIsUserOnline hook — subscribers re-render only
 * when the target user's online state flips, not on every presence
 * sync.
 */
export function OnlineIndicator({
  userId,
  lastSeenAt,
  variant = 'dot-label',
  className,
  hideWhenUnknown = false,
}: Props) {
  const online = useIsUserOnline(userId)

  if (!online && !lastSeenAt) {
    if (hideWhenUnknown) return null
    if (variant === 'dot') {
      return (
        <span
          aria-hidden
          className={cn(
            'inline-block size-1.5 rounded-full bg-muted-foreground/30',
            className,
          )}
        />
      )
    }
    return (
      <span className={cn('text-[11px] text-muted-foreground', className)}>
        {variant === 'dot-label' ? '• Offline' : 'Offline'}
      </span>
    )
  }

  const dot = (
    <span
      aria-hidden
      className={cn(
        'inline-block size-1.5 rounded-full',
        online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
      )}
    />
  )

  if (variant === 'dot') {
    return <span className={className}>{dot}</span>
  }

  const label = online ? 'Online now' : formatLastSeen(lastSeenAt)

  if (variant === 'label') {
    return <span className={cn('text-[11px]', online ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground', className)}>{label}</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {dot}
      <span
        className={cn(
          'text-[11px]',
          online ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </span>
  )
}

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'Offline'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'Offline'
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'Active just now'
  if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `Active ${Math.floor(diff / 86400)}d ago`
  return 'Offline'
}

/**
 * Compact overlay variant — a small dot positioned in the bottom-right
 * of an avatar. Caller supplies the containing `<Avatar>` parent; this
 * renders the absolutely-positioned dot.
 */
export function AvatarOnlineDot({
  userId,
  className,
}: {
  userId: string | null | undefined
  className?: string
}) {
  const online = useIsUserOnline(userId)
  if (!online) return null
  return (
    <span
      aria-hidden
      className={cn(
        'absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-emerald-500',
        className,
      )}
    />
  )
}
