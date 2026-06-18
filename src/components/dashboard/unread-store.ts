"use client";

// Optimistic unread store for the sidebar Messages badge.
//
// The badge value is computed server-side (countUnreadConversations) and handed
// to the shell as a prop. Reading a conversation emits no server event, so the
// prop alone never decrements until the next navigation — the bug. This module
// lets the open thread decrement the badge INSTANTLY (optimistic), then the
// server prop reconciles it: seedUnread() resets the optimistic adjustment every
// time a fresh server count arrives, so the two never drift or double-count.

import { useSyncExternalStore } from "react";

let serverCount = 0;
const readIds = new Set<string>(); // conversations optimistically read since the last seed
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** The shell calls this with the authoritative server count on every render. */
export function seedUnread(count: number) {
  if (serverCount === count && readIds.size === 0) return;
  serverCount = count;
  readIds.clear(); // server is authoritative — drop optimistic adjustments
  emit();
}

/** The open thread calls this when it reads a conversation that was unread. */
export function markReadOptimistic(conversationId: string, wasUnread: boolean) {
  if (!wasUnread || readIds.has(conversationId)) return;
  readIds.add(conversationId);
  emit();
}

function snapshot() {
  return Math.max(0, serverCount - readIds.size);
}

export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, snapshot, () => serverCount);
}
