'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, X } from 'lucide-react'
import { usePushSubscription } from '@/hooks/use-push-subscription'
import { showToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'paintpro_push_banner_dismissed_v1'

/**
 * Mounts the push-subscription hook (registers /sw.js and resubscribes
 * automatically on revisits) and renders a one-time dismissible banner
 * when the browser hasn't been asked yet.
 *
 * Decision matrix:
 *
 *   permission=granted, subscribed   → silent (everything's wired)
 *   permission=granted, !subscribed  → silent re-subscribe attempted
 *   permission=denied                → silent (don't nag — user said no)
 *   permission=default + dismissed   → silent (user hit "not now")
 *   permission=default + !dismissed  → show banner
 *   permission=unsupported           → silent
 *
 * Mounted in both contractor and homeowner layouts. One per session.
 */
export function PushNotificationsManager() {
  const { permission, subscribed, loading, subscribe } = usePushSubscription()
  // The dialog depends on browser-only state (localStorage + permission API).
  // Render nothing on the server; flip `mounted` after hydration so the
  // first client render matches the SSR output. Without this, SSR renders
  // the banner (no localStorage) while CSR returns null (dismissed=true)
  // and React throws a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState<boolean>(false)
  useEffect(() => {
    setMounted(true)
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') setDismissed(true)
    } catch {
      // ignore — storage disabled
    }
  }, [])

  // Silent re-subscribe: if permission was previously granted but the
  // browser dropped the subscription (cleared site data, new device),
  // try to recreate it without prompting. Only runs when permission is
  // already granted, so no UI surprise.
  useEffect(() => {
    if (permission === 'granted' && !subscribed && !loading) {
      subscribe().catch(() => undefined)
    }
  }, [permission, subscribed, loading, subscribe])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // storage disabled — accept silently
    }
  }

  async function handleEnable() {
    const ok = await subscribe()
    if (ok) {
      showToast('Browser notifications enabled', {
        description: "You'll get a desktop alert even when this tab is closed.",
        type: 'success',
      })
      dismiss()
    } else {
      // Permission denied or hardware doesn't support it — record dismissal
      // so we don't nag, and surface the state.
      dismiss()
      showToast('Could not enable browser notifications', {
        description: 'Check your browser permission settings if you want to turn this on later.',
        type: 'warning',
      })
    }
  }

  // Bail conditions
  if (!mounted) return null                        // wait for hydration
  if (permission === 'unsupported') return null    // not a push-capable browser
  if (permission === 'denied') return null         // user actively blocked
  if (permission === 'granted' && subscribed) return null
  if (dismissed) return null

  return (
    <div
      role="dialog"
      aria-label="Enable browser notifications"
      className={cn(
        'fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-border bg-popover p-4 shadow-lg',
        'sm:inset-x-auto sm:left-4 sm:bottom-4',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">
            Enable browser notifications
          </p>
          <p className="text-xs leading-snug text-muted-foreground">
            Get a desktop alert when a new lead, quote, or message arrives — even
            when this tab is closed.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={dismiss} disabled={loading}>
          Not now
        </Button>
        <Button size="sm" onClick={handleEnable} disabled={loading} className="gap-1.5">
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Enabling…
            </>
          ) : (
            <>
              <BellOff className="size-3.5" />
              Enable
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
