'use client'

import { useState, useTransition } from 'react'
import { Bell, BellOff, Check, Loader2, Sparkles, VolumeX } from 'lucide-react'
import { sendTestNotificationAction } from '@/lib/notifications/test-action'
import { showToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { usePushSubscription } from '@/hooks/use-push-subscription'
import type { NotificationType } from '@/lib/notifications'

const TYPES: NotificationType[] = [
  'LEAD',
  'QUOTE',
  'JOB',
  'PAYMENT',
  'DISPUTE',
  'SYSTEM',
]

const QUIET_TOASTS_KEY = 'paintpro_toasts_quiet'

/**
 * Floating dev-only button. Triggers sendTestNotificationAction so the
 * notification bell + toast subscription fires end-to-end. Hidden in
 * production via NODE_ENV check.
 *
 * Click the badge to open a tiny menu of notification types; pick one
 * and the action sends it to your own user. The Realtime listener in
 * <NotificationBell /> picks it up and shows the toast within ~1s.
 */
export function TestNotificationButton() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  // Read preference synchronously during initial render. Lazy initializer
  // + window guard avoids the set-state-in-effect anti-pattern.
  const [quietToasts, setQuietToasts] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(QUIET_TOASTS_KEY) === '1'
    } catch {
      return false
    }
  })
  const push = usePushSubscription()

  function toggleQuietToasts() {
    const next = !quietToasts
    setQuietToasts(next)
    try {
      if (next) localStorage.setItem(QUIET_TOASTS_KEY, '1')
      else localStorage.removeItem(QUIET_TOASTS_KEY)
    } catch {
      // ignore
    }
    // Show one final toast on the way *to* quiet mode so the user knows it took effect.
    if (next) {
      showToast('Toasts muted', {
        description: 'Page refreshes still happen; only the toast popups are silenced.',
        type: 'info',
      })
    } else {
      showToast('Toasts unmuted', { type: 'info' })
    }
  }

  if (process.env.NODE_ENV === 'production') return null

  function fire(type?: NotificationType) {
    startTransition(async () => {
      const res = await sendTestNotificationAction(type)
      if (!res.ok) {
        showToast(res.message, { type: 'error' })
        return
      }
      // The toast you see will come from the Realtime listener, not from
      // here — that's the point of the test. Wait ~1s.
    })
    setOpen(false)
  }

  async function togglePush() {
    if (push.subscribed) {
      await push.unsubscribe()
      showToast('Browser notifications disabled', { type: 'info' })
    } else {
      const ok = await push.subscribe()
      if (ok) {
        showToast('Browser notifications enabled', {
          description: 'Try sending a test now — you should get an OS notification too.',
          type: 'success',
        })
      } else {
        showToast('Could not enable browser notifications', {
          description:
            push.permission === 'denied'
              ? 'Permission was denied — re-enable in your browser settings.'
              : 'Your browser may not support push notifications.',
          type: 'warning',
        })
      }
    }
  }

  const pushLabel =
    push.permission === 'unsupported'
      ? 'Push: not supported'
      : push.permission === 'denied'
        ? 'Push: blocked by browser'
        : push.subscribed
          ? 'Push: enabled ✓ (click to disable)'
          : 'Push: click to enable'

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="mb-2 flex w-56 flex-col gap-1 rounded-lg border border-border bg-popover p-2 text-xs shadow-lg">
          {/* Push toggle row */}
          <button
            type="button"
            onClick={togglePush}
            disabled={
              push.loading ||
              push.permission === 'unsupported' ||
              push.permission === 'denied'
            }
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors disabled:opacity-60',
              push.subscribed
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'text-foreground hover:bg-accent',
            )}
          >
            {push.loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : push.subscribed ? (
              <Check className="size-3.5" />
            ) : (
              <BellOff className="size-3.5" />
            )}
            <span className="text-[11px] leading-tight">{pushLabel}</span>
          </button>

          {/* Quiet toasts toggle */}
          <button
            type="button"
            onClick={toggleQuietToasts}
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
              quietToasts
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                : 'text-foreground hover:bg-accent',
            )}
          >
            <VolumeX className="size-3.5" />
            <span className="text-[11px] leading-tight">
              {quietToasts ? 'Toasts: muted ✓' : 'Toasts: muted off'}
            </span>
          </button>

          <div className="my-1 border-t border-border" />

          <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Send test notification
          </p>
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => fire(t)}
              disabled={pending}
              className="rounded px-2 py-1 text-left text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => fire()}
            disabled={pending}
            className="mt-1 rounded border-t border-border bg-primary/10 px-2 py-1 text-left font-medium text-primary disabled:opacity-50"
          >
            🎲 Random
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        disabled={pending}
        title="Send a test notification (dev only)"
        className={cn(
          'flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all',
          'hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          pending && 'cursor-wait',
        )}
        aria-label="Send test notification"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : open ? (
          <Sparkles className="size-5" />
        ) : (
          <Bell className="size-5" />
        )}
      </button>
    </div>
  )
}
