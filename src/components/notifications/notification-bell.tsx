'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Briefcase,
  MessageSquare,
  FileText,
  Banknote,
  Star,
  AlertTriangle,
  Info,
  Hammer,
  Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationRow,
} from '@/lib/notifications/actions'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { showToast, type ToastType } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/format'

// Map a notification type to the toast palette. Disputes shout louder.
const TOAST_TYPE_BY_NOTIF: Record<string, ToastType> = {
  LEAD:    'info',
  QUOTE:   'success',
  JOB:     'success',
  PAYMENT: 'success',
  REVIEW:  'info',
  DISPUTE: 'warning',
  SYSTEM:  'info',
  MESSAGE: 'info',
}

// ────────────────────────────────────────────────
// Notification sound presets
//
// Each preset is a list of pulses { freq (Hz), startMs, durationMs }.
// Switch the active sound by changing SOUND_PRESET below. All presets
// run through the same synth so the gain envelope and overall volume
// stay consistent.
//
//   `chime`   — original two-tone E5 → A5. Bright, attention-grabbing.
//   `lift`    — three-note arpeggio C5 → E5 → G5. Warmer, more melodic.
//   `bell`    — single soft bell at A5 with long decay. Subtle.
//   `pluck`   — quick triangle blip + tail. Low-key, fits busy dashboards.
//   `tritone` — Slack-style mid-low ascending blip. Distinctive.
//
// Browsers block audio until the page has user interaction, so the
// first sound on a fresh tab may be silent — that's a browser policy,
// not a bug. Once the user clicks anywhere, sound works.
// ────────────────────────────────────────────────

type SoundPulse = {
  freq: number
  startMs: number
  durationMs: number
  /** Defaults to 'sine'. Use 'triangle' for warmer / 'square' for sharper. */
  type?: OscillatorType
  /** 0–1, defaults to 0.12. */
  gain?: number
}

const SOUND_PRESETS: Record<string, SoundPulse[]> = {
  chime: [
    { freq: 659.25, startMs: 0,   durationMs: 120 },  // E5
    { freq: 880,    startMs: 130, durationMs: 160 },  // A5
  ],
  lift: [
    { freq: 523.25, startMs: 0,   durationMs: 90,  type: 'triangle' },  // C5
    { freq: 659.25, startMs: 80,  durationMs: 90,  type: 'triangle' },  // E5
    { freq: 783.99, startMs: 160, durationMs: 180, type: 'triangle' },  // G5
  ],
  bell: [
    { freq: 880, startMs: 0, durationMs: 600, type: 'sine', gain: 0.10 },
  ],
  pluck: [
    { freq: 1046.5, startMs: 0,  durationMs: 60,  type: 'triangle', gain: 0.10 }, // C6
    { freq: 783.99, startMs: 50, durationMs: 220, type: 'triangle', gain: 0.08 }, // G5 tail
  ],
  tritone: [
    { freq: 392, startMs: 0,   durationMs: 80,  type: 'sine' },  // G4
    { freq: 587, startMs: 90,  durationMs: 130, type: 'sine' },  // D5
  ],
}

// Change this to swap the bell sound globally.
// Options: 'chime' | 'lift' | 'bell' | 'pluck' | 'tritone'
const SOUND_PRESET = 'lift'

function playNotificationSound(): void {
  if (typeof window === 'undefined') return
  try {
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const now = ctx.currentTime
    const pulses = SOUND_PRESETS[SOUND_PRESET]
    let lastEnd = now

    for (const p of pulses) {
      const start = now + p.startMs / 1000
      const end = start + p.durationMs / 1000
      const peak = p.gain ?? 0.12
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = p.type ?? 'sine'
      osc.frequency.value = p.freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(peak, start + 0.01)              // 10ms attack
      gain.gain.exponentialRampToValueAtTime(0.0001, end)                // exp decay
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(end + 0.05)
      if (end > lastEnd) lastEnd = end
    }

    // Close the context shortly after the last pulse finishes so we don't
    // leak audio nodes if the user fires many notifications in a row.
    const closeDelayMs = (lastEnd - now) * 1000 + 200
    setTimeout(() => ctx.close().catch(() => undefined), closeDelayMs)
  } catch (err) {
    console.warn('[notifications] sound failed', err)
  }
}

// ────────────────────────────────────────────────
// Type → icon mapping
// ────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  LEAD:    Briefcase,
  QUOTE:   FileText,
  JOB:     Hammer,
  PAYMENT: Banknote,
  REVIEW:  Star,
  DISPUTE: AlertTriangle,
  SYSTEM:  Info,
  MESSAGE: MessageSquare,
}

const TYPE_COLORS: Record<string, string> = {
  LEAD:    'bg-blue-100 text-blue-600',
  QUOTE:   'bg-violet-100 text-violet-600',
  JOB:     'bg-orange-100 text-orange-600',
  PAYMENT: 'bg-emerald-100 text-emerald-600',
  REVIEW:  'bg-yellow-100 text-yellow-600',
  DISPUTE: 'bg-red-100 text-red-600',
  SYSTEM:  'bg-muted text-muted-foreground',
  MESSAGE: 'bg-sky-100 text-sky-600',
}

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

interface Props {
  userId: string
  initialUnreadCount?: number
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

export function NotificationBell({ userId, initialUnreadCount = 0 }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialUnreadCount)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [, startTransition] = useTransition()

  // Fetch notification list on first open
  const loadItems = useCallback(async () => {
    if (loaded) return
    const rows = await getNotificationsAction(20)
    setItems(rows)
    setLoaded(true)
  }, [loaded])

  useEffect(() => {
    if (open) loadItems()
  }, [open, loadItems])

  // Realtime — listen on the existing `user:{userId}` inbox channel
  // that chat already uses. The RLS policy on realtime.messages
  // (migration 0009_chat_realtime_v2.sql) restricts this topic to its
  // owner. We previously tried postgres_changes here but the JWT didn't
  // reach the realtime socket reliably under @supabase/ssr — broadcast
  // is the same path chat uses and it works perfectly.
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const supabase = createClient()
    const topic = `user:${userId}`
    console.log('[notifications] subscribing to', topic)

    const channel = supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'notification:new' }, (raw) => {
        const payload = (raw as { payload?: Record<string, unknown> })?.payload
        if (!payload) return
        console.log('[notifications] received', payload)

        const row: NotificationRow = {
          ...(payload as object),
          id:         String(payload.id ?? ''),
          type:       payload.type as NotificationRow['type'],
          title:      String(payload.title ?? ''),
          body:       String(payload.body ?? ''),
          actionUrl:  (payload.actionUrl as string | null) ?? null,
          entityType: (payload.entityType as NotificationRow['entityType']) ?? null,
          entityId:   (payload.entityId as string | null) ?? null,
          isRead:     false,
          createdAt:  payload.createdAt
            ? new Date(payload.createdAt as string)
            : new Date(),
        } as NotificationRow

        setItems((prev) => [row, ...prev])
        setUnread((n) => n + 1)

        showToast(row.title, {
          description: row.body,
          type: TOAST_TYPE_BY_NOTIF[row.type] ?? 'info',
          actionLabel: row.actionUrl ? 'View' : undefined,
          onAction: row.actionUrl
            ? () => routerRef.current.push(row.actionUrl!)
            : undefined,
        })
        playNotificationSound()
      })
      .subscribe((status) => {
        // status: SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR
        console.log('[notifications] channel status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const handleOpen = (next: boolean) => {
    setOpen(next)
  }

  const handleNotificationClick = async (row: NotificationRow) => {
    if (!row.isRead) {
      startTransition(async () => {
        await markNotificationReadAction(row.id)
        setItems((prev) =>
          prev.map((n) => (n.id === row.id ? { ...n, isRead: true } : n))
        )
        setUnread((n) => Math.max(0, n - 1))
      })
    }
    if (row.actionUrl) {
      setOpen(false)
      router.push(row.actionUrl)
    }
  }

  const handleMarkAllRead = async () => {
    startTransition(async () => {
      await markAllNotificationsReadAction()
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold leading-none text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 gap-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Check className="size-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="h-[400px]">
          {!loaded && (
            <div className="space-y-px p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg p-3">
                  <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {loaded && items.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Bell className="mb-3 size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                We'll let you know when something happens.
              </p>
            </div>
          )}

          {loaded && items.length > 0 && (
            <div className="p-1">
              {items.map((item) => {
                const Icon = TYPE_ICONS[item.type] ?? Info
                const colorClass = TYPE_COLORS[item.type] ?? TYPE_COLORS.SYSTEM
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent',
                      !item.isRead && 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-950/30'
                    )}
                  >
                    <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs', colorClass)}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn(' text-sm', item.isRead ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {item.body}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(item.createdAt))}
                      </p>
                    </div>
                    {!item.isRead && (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-violet-500" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
