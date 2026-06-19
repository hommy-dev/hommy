'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/icon'
import { createClient } from '@/lib/supabase/client'
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationRow,
} from '@/lib/notifications/actions'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { showToast, type ToastType } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/format'

// type → toast palette / icon. Unknown types fall back to SYSTEM/Info.
const TOAST_TYPE_BY_NOTIF: Record<string, ToastType> = {
  LEAD: 'info',
  ESTIMATE: 'success',
  FOLLOW_UP: 'info',
  STORM_ALERT: 'warning',
  REVIEW: 'info',
  MESSAGE: 'info',
  SYSTEM: 'info',
}

const TYPE_ICONS: Record<string, IconName> = {
  LEAD: 'work',
  ESTIMATE: 'document',
  FOLLOW_UP: 'time-circle',
  STORM_ALERT: 'danger-triangle',
  REVIEW: 'star',
  MESSAGE: 'message',
  SYSTEM: 'info-square',
}

const TYPE_COLORS: Record<string, string> = {
  LEAD: 'bg-primary/10 text-primary',
  ESTIMATE: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  FOLLOW_UP: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
  STORM_ALERT: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
  REVIEW: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300',
  MESSAGE: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
  SYSTEM: 'bg-muted text-muted-foreground',
}

// A short two-note "lift" chime. Browsers block audio until the page has had a
// user interaction, so the first sound on a fresh tab may be silent.
function playNotificationSound(): void {
  if (typeof window === 'undefined') return
  try {
    const AC =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const now = ctx.currentTime
    const pulses = [
      { freq: 523.25, start: 0, dur: 0.09 },
      { freq: 659.25, start: 0.08, dur: 0.09 },
      { freq: 783.99, start: 0.16, dur: 0.18 },
    ]
    for (const p of pulses) {
      const start = now + p.start
      const end = start + p.dur
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = p.freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.12, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(end + 0.05)
    }
    setTimeout(() => ctx.close().catch(() => undefined), 600)
  } catch {
    // audio unavailable — not fatal
  }
}

interface Props {
  userId: string
  initialUnreadCount?: number
}

export function NotificationBell({ userId, initialUnreadCount = 0 }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialUnreadCount)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [, startTransition] = useTransition()

  const loadItems = useCallback(async () => {
    if (loaded) return
    const rows = await getNotificationsAction(20)
    setItems(rows)
    setLoaded(true)
  }, [loaded])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-open; state is set after the await, not synchronously
    if (open) loadItems()
  }, [open, loadItems])

  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])

  // Live updates on the private user:{userId} channel (same channel the
  // realtime refresh hook uses). RLS in drizzle/0001 scopes it to its owner.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`user:${userId}`, { config: { private: true } })
      .on('broadcast', { event: 'notification:new' }, (raw) => {
        const payload = (raw as { payload?: Record<string, unknown> })?.payload
        if (!payload) return

        const row = {
          id: String(payload.id ?? ''),
          userId,
          type: String(payload.type ?? 'SYSTEM'),
          title: String(payload.title ?? ''),
          body: String(payload.body ?? ''),
          actionUrl: (payload.actionUrl as string | null) ?? null,
          entityType: (payload.entityType as string | null) ?? null,
          entityId: (payload.entityId as string | null) ?? null,
          isRead: false,
          createdAt: payload.createdAt ? new Date(payload.createdAt as string) : new Date(),
        } as unknown as NotificationRow

        setItems((prev) => [row, ...prev])
        setUnread((n) => n + 1)

        showToast(row.title, {
          description: row.body,
          type: TOAST_TYPE_BY_NOTIF[row.type] ?? 'info',
          actionLabel: row.actionUrl ? 'View' : undefined,
          onAction: row.actionUrl ? () => routerRef.current.push(row.actionUrl!) : undefined,
        })
        playNotificationSound()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleClick = (row: NotificationRow) => {
    if (!row.isRead) {
      startTransition(async () => {
        await markNotificationReadAction(row.id)
        setItems((prev) => prev.map((n) => (n.id === row.id ? { ...n, isRead: true } : n)))
        setUnread((n) => Math.max(0, n - 1))
      })
    }
    if (row.actionUrl) {
      setOpen(false)
      router.push(row.actionUrl)
    }
  }

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction()
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
          className="relative flex size-9 lg:size-[2.5vw] items-center justify-center rounded-full text-foreground/65 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Icon name="notification" className="size-[18px] lg:size-[1.25vw]" />
          {unread > 0 && (
            <span className="absolute right-1 lg:right-[0.278vw] top-1 lg:top-[0.278vw] flex items-center justify-center rounded-full bg-primary p-1 lg:p-[0.278vw] text-[10px] lg:text-[0.694vw] font-bold leading-1 text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 lg:w-[22.222vw] p-0 lg:p-0 gap-0 lg:gap-0">
        <div className="flex items-center justify-between border-b border-border p-3 lg:p-[0.833vw]">
          <h3 className="text-sm lg:text-[0.972vw] font-semibold">Notifications</h3>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 lg:gap-[0.278vw] text-xs lg:text-[0.833vw] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon name="tick" className="size-3 lg:size-[0.833vw]" />
              Mark all read
            </button>
          )}
        </div>

        <ScrollArea className="h-[380px] lg:h-[26.389vw] ">
          {!loaded && (
            <div className="space-y-px lg:space-y-[0.069vw] p-2 lg:p-[0.556vw]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 lg:gap-[0.833vw] rounded-md lg:rounded-[0.5vw] p-3 lg:p-[0.833vw]">
                  <div className="size-8 lg:size-[2.222vw] shrink-0 animate-pulse rounded-md lg:rounded-[0.5vw] bg-muted" />
                  <div className="flex-1 space-y-2 lg:space-y-[0.556vw] py-1 lg:py-[0.278vw]">
                    <div className="h-3 lg:h-[0.833vw] w-32 lg:w-[8.889vw] animate-pulse rounded lg:rounded-[0.324vw] bg-muted" />
                    <div className="h-3 lg:h-[0.833vw] w-48 lg:w-[13.333vw] animate-pulse rounded lg:rounded-[0.324vw] bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {loaded && items.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 lg:px-[1.111vw] py-12 lg:py-[3.333vw] text-center">
              <Icon name="notification" className="mb-3 lg:mb-[0.833vw] size-8 lg:size-[2.222vw] text-muted-foreground/40" />
              <p className="text-sm lg:text-[0.972vw] font-medium text-muted-foreground">No notifications yet</p>
              <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.833vw] text-muted-foreground/60">
                New leads and updates will show up here.
              </p>
            </div>
          )}

          {loaded && items.length > 0 && (
            <div className="p-1 lg:p-[0.278vw]">
              {items.map((item) => {
                const iconName = TYPE_ICONS[item.type] ?? 'info-square'
                const colorClass = TYPE_COLORS[item.type] ?? TYPE_COLORS.SYSTEM
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    className={cn(
                      'flex w-full items-start gap-3 lg:gap-[0.833vw] rounded-md lg:rounded-[0.5vw] p-3 lg:p-[0.833vw] text-left transition-colors hover:bg-accent',
                      !item.isRead && 'bg-primary/5 hover:bg-primary/10',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 lg:mt-[0.139vw] flex size-8 lg:size-[2.222vw] shrink-0 items-center justify-center rounded-md lg:rounded-[0.5vw]',
                        colorClass,
                      )}
                    >
                      <Icon name={iconName} className="size-3.5 lg:size-[0.972vw]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm lg:text-[0.972vw]',
                          item.isRead ? 'text-muted-foreground' : 'font-medium text-foreground',
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 lg:mt-[0.139vw] line-clamp-2 text-xs lg:text-[0.833vw] text-muted-foreground">
                        {item.body}
                      </p>
                      <p className="mt-1 lg:mt-[0.278vw] text-[10px] lg:text-[0.694vw] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(item.createdAt))}
                      </p>
                    </div>
                    {!item.isRead && (
                      <span className="mt-2 lg:mt-[0.556vw] size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary" />
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
