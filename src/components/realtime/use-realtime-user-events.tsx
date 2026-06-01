'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { showToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/format'
import {
  USER_EVENTS,
  type UserEventName,
  type UserEventPayload,
} from '@/lib/realtime/user-events'

type Role = 'HOMEOWNER' | 'CONTRACTOR'

/** localStorage key for the dev "quiet toasts" toggle. */
const QUIET_TOASTS_KEY = 'paintpro_toasts_quiet'

/**
 * Should we suppress a toast for this event?
 * Two reasons:
 *   1. The user is already on the page that's about to be refreshed —
 *      they'll see the new state, no need to also pop a toast.
 *   2. The user has flipped the quiet toggle in the dev menu (and later
 *      in real settings).
 */
function shouldSuppressToast<E extends UserEventName>(
  event: E,
  payload: UserEventPayload[E],
  pathname: string | null,
): boolean {
  // Universal: dev quiet toggle.
  if (typeof window !== 'undefined') {
    try {
      if (localStorage.getItem(QUIET_TOASTS_KEY) === '1') return true
    } catch {
      // storage disabled — ignore
    }
  }

  if (!pathname) return false

  // Per-event: if the user is sitting on the page the event refreshes,
  // skip the toast. The router.refresh() already shows the change.
  switch (event) {
    case 'quote:new': {
      const p = payload as UserEventPayload['quote:new']
      return pathname === `/homeowner/projects/${p.projectId}`
    }
    case 'quote:withdrawn': {
      const p = payload as UserEventPayload['quote:withdrawn']
      return pathname === `/homeowner/projects/${p.projectId}`
    }
    case 'lead:viewed':
    case 'lead:declined': {
      const p = payload as UserEventPayload['lead:viewed' | 'lead:declined']
      return pathname === `/homeowner/projects/${p.projectId}`
    }
    case 'quote:accepted': {
      const p = payload as UserEventPayload['quote:accepted']
      // Contractor sitting on the lead detail or jobs page that just changed.
      return (
        pathname.startsWith('/contractor/leads') ||
        pathname === `/contractor/jobs/${p.jobId}`
      )
    }
    case 'quote:rejected': {
      return pathname.startsWith('/contractor/leads')
    }
    case 'payment:released': {
      const p = payload as UserEventPayload['payment:released']
      return pathname === `/contractor/jobs/${p.jobId}`
    }
    case 'lead:new':
    case 'project:status-changed':
    case 'job:status-changed':
    case 'notification:new':
    default:
      return false
  }
}

/**
 * One subscription per session — mounted in the role layout.
 *
 * Listens on the existing `user:{userId}` private channel for the
 * lead/quote/project/job events the server broadcasts after every
 * mutation. On receipt:
 *
 *   1. Triggers a soft router.refresh() so server components on the
 *      current page re-fetch and the new data slides in without a
 *      full page reload.
 *   2. Optionally fires a toast for events that wouldn't otherwise
 *      surface a separate notification (e.g. a contractor's quote
 *      was just accepted — they probably want to *see* that fact
 *      surface on screen, not just a bell badge).
 *
 * The bell handles `notification:new` separately, so this hook
 * deliberately ignores that event to avoid duplicate toasts.
 */
export function useRealtimeUserEvents(userId: string, role: Role) {
  const router = useRouter()
  const pathname = usePathname()
  const routerRef = useRef(router)
  const pathnameRef = useRef(pathname)
  routerRef.current = router
  pathnameRef.current = pathname

  // Throttle refreshes — if the user gets 5 events in 200ms (e.g. mass
  // quote acceptance fanout), one refresh covers all of them.
  const refreshScheduledRef = useRef(false)

  function scheduleRefresh() {
    if (refreshScheduledRef.current) return
    refreshScheduledRef.current = true
    setTimeout(() => {
      refreshScheduledRef.current = false
      routerRef.current.refresh()
    }, 100)
  }

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const topic = `user:${userId}`
    console.log('[realtime-user-events] subscribing to', topic, 'as', role)

    const channel = supabase.channel(topic, { config: { private: true } })

    function handler<E extends UserEventName>(eventName: E) {
      return (raw: { payload?: unknown }) => {
        const payload = raw?.payload as UserEventPayload[E] | undefined
        if (!payload) return
        dispatch(eventName, payload, role, scheduleRefresh, pathnameRef.current)
      }
    }

    channel
      // Skip notification:new — the bell handles it.
      .on('broadcast', { event: USER_EVENTS.LEAD_NEW },              handler('lead:new'))
      .on('broadcast', { event: USER_EVENTS.LEAD_VIEWED },           handler('lead:viewed'))
      .on('broadcast', { event: USER_EVENTS.LEAD_DECLINED },         handler('lead:declined'))
      .on('broadcast', { event: USER_EVENTS.QUOTE_NEW },             handler('quote:new'))
      .on('broadcast', { event: USER_EVENTS.QUOTE_ACCEPTED },        handler('quote:accepted'))
      .on('broadcast', { event: USER_EVENTS.QUOTE_REJECTED },        handler('quote:rejected'))
      .on('broadcast', { event: USER_EVENTS.QUOTE_WITHDRAWN },       handler('quote:withdrawn'))
      .on('broadcast', { event: USER_EVENTS.PROJECT_STATUS_CHANGED }, handler('project:status-changed'))
      .on('broadcast', { event: USER_EVENTS.JOB_STATUS_CHANGED },    handler('job:status-changed'))
      .on('broadcast', { event: USER_EVENTS.PAYMENT_RELEASED },      handler('payment:released'))
      .subscribe((status) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.warn('[realtime-user-events] status', { userId, status })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, role])
}

// ============================================================
// Per-event dispatch — refresh + (optionally) toast.
// Keeps the subscription wiring above small.
// ============================================================

function dispatch<E extends UserEventName>(
  event: E,
  payload: UserEventPayload[E],
  role: Role,
  scheduleRefresh: () => void,
  pathname: string | null,
): void {
  // Every event triggers a soft refresh — that's the core promise.
  scheduleRefresh()

  // Suppress toasts for events the current page is already about to show.
  if (shouldSuppressToast(event, payload, pathname)) {
    return
  }

  // Some events deserve their own toast on top of (or instead of) the
  // notification bell. Toasts here are conservative — sendNotification()
  // already fires bell + toast for most things; we only add a toast when
  // a side-effect event happens that isn't already a `sendNotification`.
  switch (event) {
    case 'lead:new': {
      // Already toasts via the bell (notification:new). No-op.
      return
    }
    case 'quote:accepted': {
      if (role === 'CONTRACTOR') {
        // Already toasts via the bell. No-op.
      }
      return
    }
    case 'project:status-changed': {
      // Silent — the page refresh shows the new pill. A toast would be noise.
      return
    }
    case 'lead:viewed': {
      const p = payload as UserEventPayload['lead:viewed']
      if (role === 'HOMEOWNER') {
        // No bell notification fires for "viewed" today, so surface it here.
        // Soft, low-key — homeowner just wants to know their post is being read.
        showToast(`${p.contractorBusinessName} is reviewing your project`, {
          type: 'info',
        })
      }
      return
    }
    case 'lead:declined': {
      const p = payload as UserEventPayload['lead:declined']
      if (role === 'HOMEOWNER') {
        showToast(`${p.contractorBusinessName} declined`, {
          description: 'No worries — other matched painters are still reviewing.',
          type: 'info',
        })
      }
      return
    }
    case 'quote:withdrawn': {
      if (role === 'HOMEOWNER') {
        showToast('A quote was withdrawn', {
          description: 'You can still review the others.',
          type: 'info',
        })
      }
      return
    }
    case 'payment:released': {
      const p = payload as UserEventPayload['payment:released']
      if (role === 'CONTRACTOR') {
        showToast('Payment released', {
          description: `${formatCurrency(p.amount)} on its way to your account.`,
          type: 'success',
        })
      }
      return
    }
    default:
      return
  }
}
