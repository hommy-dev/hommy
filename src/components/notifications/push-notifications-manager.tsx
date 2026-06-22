'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { usePushSubscription } from '@/hooks/use-push-subscription'
import { showToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'hommy_push_banner_dismissed_v1'

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe init: read localStorage only after mount
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
        'fixed inset-x-3 lg:inset-x-[0.833vw] bottom-3 lg:bottom-[0.833vw] z-40 mx-auto max-w-md lg:max-w-[31.108vw] rounded-md lg:rounded-[0.6vw] border border-border bg-popover p-4 lg:p-[1.111vw] shadow-lg',
        'sm:inset-x-auto sm:left-4 sm:bottom-4',
      )}
    >
      <div className="flex items-start gap-3 lg:gap-[0.833vw]">
        <span className="flex size-9 lg:size-[2.5vw] shrink-0 items-center justify-center rounded-lg lg:rounded-[0.694vw] bg-primary/10 text-primary">
          <Icon name="notification" className="size-4 lg:size-[1.111vw]" />
        </span>
        <div className="min-w-0 flex-1 space-y-1 lg:space-y-[0.278vw]">
          <p className="text-sm lg:text-[0.972vw] font-medium text-foreground">
            Enable browser notifications
          </p>
          <p className="text-xs lg:text-[0.833vw] leading-snug text-muted-foreground">
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
          <Icon name="close" className="size-4 lg:size-[1.111vw]" />
        </button>
      </div>
      <div className="mt-3 lg:mt-[0.833vw] flex items-center justify-end gap-2 lg:gap-[0.556vw]">
        <Button variant="ghost" size="sm" onClick={dismiss} disabled={loading}>
          Not now
        </Button>
        <Button size="sm" onClick={handleEnable} disabled={loading} className="gap-1.5 lg:gap-[0.417vw]">
          {loading ? (
            <>
              <span className="block size-3.5 lg:size-[0.972vw] animate-spin rounded-full border-2 border-current border-t-transparent" /> Enabling…
            </>
          ) : (
            <>
              <Icon name="notification" className="size-3.5 lg:size-[0.972vw]" />
              Enable
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
