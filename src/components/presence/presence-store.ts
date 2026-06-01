'use client'

/**
 * Platform-wide presence store — mirrors the `presence:platform`
 * Supabase Realtime channel state as a reactive, typed snapshot usable
 * from anywhere in the app (chat sidebar, lead cards, contractor
 * profile cards, thread header, future engagement-scoring UIs).
 *
 * Built on `useSyncExternalStore` — same pattern as chat-store.ts, zero
 * new deps, clean SSR hydration.
 *
 * TODO (SCALE): at ~1k concurrent users, migrate from a single global
 * channel to sharded presence (`presence:shard:{hash(userId) % N}`).
 * The selectors below abstract away which layout is in use so the
 * migration is internal to `use-platform-presence.ts`.
 */

import { useSyncExternalStore } from 'react'

type State = {
  /** User ids currently "online" per the presence channel state. */
  onlineUserIds: Set<string>
}

const listeners = new Set<() => void>()
let state: State = {
  onlineUserIds: new Set(),
}

function emit() {
  for (const l of listeners) l()
}

function setState(next: State) {
  if (next === state) return
  state = next
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
}

// ----- Mutations -----------------------------------------------------

/**
 * Replace the set of online user ids wholesale. Called after each
 * presence sync / join / leave event — simpler than diffing and
 * guaranteed consistent since Supabase's `presenceState()` is the
 * source of truth for the channel.
 */
export function setOnlineUserIds(next: Iterable<string>) {
  const nextSet = next instanceof Set ? next : new Set(next)
  // Cheap equality check so we don't re-render subscribers for an
  // unchanged snapshot (common because sync fires on every heartbeat).
  if (nextSet.size === state.onlineUserIds.size) {
    let identical = true
    for (const id of nextSet) {
      if (!state.onlineUserIds.has(id)) {
        identical = false
        break
      }
    }
    if (identical) return
  }
  setState({ onlineUserIds: nextSet })
}

// ----- Selectors / hooks --------------------------------------------

/**
 * Is this specific user currently online on the platform?
 * Works for any role — used across chat, leads, profile cards.
 */
export function useIsUserOnline(userId: string | null | undefined): boolean {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (!userId) return false
  return snap.onlineUserIds.has(userId)
}

/**
 * The full set of currently-online user ids. Use sparingly — subscribers
 * re-render on every presence change. Prefer `useIsUserOnline(id)` for
 * single-user lookups; this is intended for admin dashboards / counts.
 */
export function useOnlineUserIds(): Set<string> {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return snap.onlineUserIds
}
