"use client";

// Client-side messaging cache. Conversation summaries (for instant headers) and
// per-conversation thread state live in module-level maps that survive client
// navigation, so switching channels is instant and revisiting an already-loaded
// thread shows immediately while it revalidates in the background — the way
// Discord/Slack/etc. behave. The DB is still the source of truth; this is a
// cache on top of it, kept fresh by realtime + background refetch.

import { useSyncExternalStore } from "react";
import type { ConversationSummary, ParticipantIdentity } from "@/lib/data/conversations";
import type { JobPanel } from "@/lib/data/jobs";
import type { DisplayMessage } from "./message-bubble";
import { fetchThread } from "@/lib/actions/messages";

export type ThreadState = {
  status: "loading" | "ready" | "error";
  messages: DisplayMessage[];
  hasMore: boolean;
  me: ParticipantIdentity | null;
  panel: JobPanel | null;
};

const summaries = new Map<string, ConversationSummary>();
const threads = new Map<string, ThreadState>();
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

/** The rail publishes its rows here so a thread's header can paint instantly. */
export function publishSummaries(list: ConversationSummary[]) {
  let changed = false;
  for (const s of list) {
    const p = summaries.get(s.id);
    // Only header-relevant fields matter to consumers (name/avatar/kind).
    if (
      !p ||
      p.otherName !== s.otherName ||
      p.otherAvatarUrl !== s.otherAvatarUrl ||
      p.otherKind !== s.otherKind
    ) {
      summaries.set(s.id, s);
      changed = true;
    }
  }
  if (changed) emit();
}

function setThread(id: string, next: ThreadState) {
  threads.set(id, next);
  emit();
}

/** Union by id (server rows win), keep pending optimistic temps, sort by time. */
function mergeMessages(prev: DisplayMessage[], next: DisplayMessage[]): DisplayMessage[] {
  const map = new Map<string, DisplayMessage>();
  for (const m of prev) map.set(m.id, m);
  for (const m of next) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/**
 * Load a thread into the cache. If it isn't cached yet we flip it to `loading`
 * (the UI shows a placeholder only in the message area); if it's already cached
 * we keep showing it and just revalidate in the background — no loading flash.
 */
export async function loadThread(id: string) {
  const existing = threads.get(id);
  if (!existing || existing.status === "error") {
    setThread(id, {
      status: "loading",
      messages: existing?.messages ?? [],
      hasMore: existing?.hasMore ?? false,
      me: existing?.me ?? null,
      panel: existing?.panel ?? null,
    });
  }

  const res = await fetchThread(id);
  const cur = threads.get(id);
  if (!res.ok) {
    setThread(id, {
      status: cur?.messages.length ? "ready" : "error",
      messages: cur?.messages ?? [],
      hasMore: cur?.hasMore ?? false,
      me: cur?.me ?? null,
      panel: cur?.panel ?? null,
    });
    return;
  }

  setThread(id, {
    status: "ready",
    me: res.detail.me,
    panel: res.panel ?? null,
    hasMore: res.hasMore,
    messages: mergeMessages(cur?.messages ?? [], res.messages),
  });
  // Seeds the header for deep-links opened before the rail has loaded.
  publishSummaries([
    {
      id,
      contextType: res.detail.contextType,
      contextId: res.detail.contextId,
      otherName: res.detail.otherName,
      otherAvatarUrl: res.detail.otherAvatarUrl,
      otherKind: res.detail.otherKind,
      lastMessageBody: null,
      lastMessageAt: null,
      hasUnread: false,
    },
  ]);
}

/** Warm the cache for a conversation the user is hovering (only if not started). */
export function prefetchThread(id: string) {
  if (threads.has(id)) return;
  void loadThread(id);
}

export function appendMessage(id: string, msg: DisplayMessage) {
  const s = threads.get(id);
  if (!s) return;
  if (s.messages.some((m) => m.id === msg.id)) return;
  setThread(id, { ...s, messages: [...s.messages, msg] });
}

export function patchMessages(id: string, fn: (prev: DisplayMessage[]) => DisplayMessage[]) {
  const s = threads.get(id);
  if (!s) return;
  setThread(id, { ...s, messages: fn(s.messages) });
}

export function useSummary(id: string | null): ConversationSummary | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (id ? summaries.get(id) : undefined),
    () => undefined,
  );
}

export function useThreadState(id: string | null): ThreadState | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (id ? threads.get(id) : undefined),
    () => undefined,
  );
}
