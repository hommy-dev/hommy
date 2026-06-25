"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { ConversationSummary } from "@/lib/data/conversations";
import { listConversationSummaries } from "@/lib/actions/messages";
import { createClient } from "@/lib/supabase/client";
import { USER_EVENTS, type UserEventPayload } from "@/lib/realtime/user-events";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ParticipantAvatar } from "./participant-avatar";
import { publishSummaries, publishInboxCount, prefetchThread } from "./messaging-store";

/**
 * The conversation rail. The chrome (title + search) renders instantly; only the
 * conversation LIST loads — fetched client-side and then kept live by a
 * subscription to the viewer's `user:{id}` channel (each message patches the
 * matching row in place: preview, time, unread dot, reorder). A message for an
 * unknown conversation triggers a refetch so brand-new threads appear.
 */
export function ConversationRail({
  basePath,
  userId,
  initialItems,
}: {
  basePath: string;
  userId: string;
  /** Server-fetched rows so the list paints instantly (still revalidated on mount). */
  initialItems?: ConversationSummary[];
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ConversationSummary[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === undefined);

  // Load the list once on mount (chrome is already on screen).
  const refetch = useCallback(() => {
    listConversationSummaries()
      .then((list) => setItems(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    listConversationSummaries()
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Latest pathname for the subscription callback (avoids resubscribing).
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const handleMessage = useCallback(
    (p: UserEventPayload["message:new"] | undefined) => {
      // System messages omit the preview; their refresh is handled elsewhere.
      if (!p?.conversationId || !p.preview) return;
      let known = true;
      setItems((prev) => {
        const idx = prev.findIndex((c) => c.id === p.conversationId);
        if (idx === -1) {
          known = false;
          return prev;
        }
        const viewing = pathnameRef.current === `${basePath}/${p.conversationId}`;
        const updated: ConversationSummary = {
          ...prev[idx],
          lastMessageBody: p.preview ?? prev[idx].lastMessageBody,
          lastMessageAt: p.createdAt ? new Date(p.createdAt) : prev[idx].lastMessageAt,
          hasUnread: p.mine ? false : !viewing,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
      if (!known) refetch(); // a brand-new conversation — pull the full list
    },
    [basePath, refetch],
  );
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`user:${userId}`, { config: { private: true } });
    channel
      .on("broadcast", { event: USER_EVENTS.MESSAGE_NEW }, (msg) =>
        handleMessageRef.current(msg.payload as UserEventPayload["message:new"] | undefined),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Opening a conversation reads it — clear its unread flag for good (not just
  // while active), so the dot doesn't reappear after navigating away. Done in the
  // click handler (below) rather than an effect to avoid a cascading re-render.
  const markRowRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.some((c) => c.id === id && c.hasUnread)
        ? prev.map((c) => (c.id === id ? { ...c, hasUnread: false } : c))
        : prev,
    );
  }, []);

  // Publish summaries so the thread pane can paint its header instantly.
  useEffect(() => {
    publishSummaries(items);
  }, [items]);

  // Tell the thread pane how many conversations exist (once loaded), so its
  // empty state can be "pick a conversation" vs a personalized "why empty".
  useEffect(() => {
    if (!loading) publishInboxCount(items.length);
  }, [loading, items.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.otherName, c.lastMessageBody].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <>
      <div className="px-4 pb-2 pt-4 lg:px-[1.111vw] lg:pb-[0.556vw] lg:pt-[1.111vw]">
        <h1 className="text-base lg:text-[1.25vw] font-semibold tracking-tight">Messages</h1>
      </div>
      <div className="px-3 pb-2 lg:px-[0.556vw] lg:pb-[0.556vw]">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            className="h-9 lg:h-[2.5vw] w-full rounded lg:rounded-[0.4vw] border pl-9 lg:pl-[2.5vw] pr-9 lg:pr-[2.5vw] text-sm lg:text-[0.903vw] outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 lg:right-[0.556vw] top-1/2 grid size-6 lg:size-[1.667vw] -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon name="close" className="size-3.5 lg:size-[0.972vw]" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 lg:px-[0.556vw]">
        {loading && items.length === 0 ? (
          <RailRowsSkeleton />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 lg:px-[1.111vw] lg:py-[2.778vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">
            {query
              ? "No matches."
              : `No conversations yet. They’ll appear here once you connect with ${basePath.includes("homeowner") ? "a contractor" : "a homeowner"}.`}
          </p>
        ) : (
          <ul className="space-y-0.5 lg:space-y-[0.139vw]">
            {filtered.map((c) => {
              const active = pathname === `${basePath}/${c.id}`;
              // The open conversation reads as read, even before mark-read commits.
              const unread = c.hasUnread && !active;
              return (
                <li key={c.id}>
                  <Link
                    href={`${basePath}/${c.id}`}
                    onPointerEnter={() => prefetchThread(c.id)}
                    onClick={() => markRowRead(c.id)}
                    className={cn(
                      "flex items-center gap-3 lg:gap-[0.833vw] rounded lg:rounded-[0.4vw] px-2.5 py-2.5 lg:px-[0.694vw] lg:py-[0.694vw] transition-colors",
                      active ? "bg-accent" : "hover:bg-muted/60",
                    )}
                  >
                    <ParticipantAvatar
                      name={c.otherName}
                      src={c.otherAvatarUrl}
                      className="size-10 lg:size-[2.778vw] border"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
                        <p
                          className={cn(
                            "truncate text-sm lg:text-[0.972vw]",
                            unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                          )}
                        >
                          {c.otherName}
                        </p>
                        {c.lastMessageAt ? (
                          <span
                            suppressHydrationWarning
                            className={cn(
                              "shrink-0 text-[11px] lg:text-[0.764vw]",
                              unread ? "font-medium text-primary" : "text-muted-foreground",
                            )}
                          >
                            {formatDistanceToNow(new Date(c.lastMessageAt))}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 lg:mt-[0.139vw] flex items-center justify-between gap-2 lg:gap-[0.556vw]">
                        <p
                          className={cn(
                            "truncate text-xs lg:text-[0.833vw]",
                            unread ? "text-foreground/90" : "text-muted-foreground",
                          )}
                        >
                          {c.lastMessageBody ?? "No messages yet"}
                        </p>
                        {unread ? (
                          <span
                            aria-label="Unread"
                            className="size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary"
                          />
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

/** Row placeholders shown only while the conversation list loads. */
function RailRowsSkeleton() {
  return (
    <div className="space-y-0.5 lg:space-y-[0.139vw]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 lg:gap-[0.833vw] px-2.5 py-2.5 lg:px-[0.694vw] lg:py-[0.694vw]"
        >
          <Skeleton className="size-10 lg:size-[2.778vw] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 lg:space-y-[0.556vw]">
            <Skeleton className="h-3.5 lg:h-[0.972vw] w-32 lg:w-[8vw]" />
            <Skeleton className="h-3 lg:h-[0.833vw] w-44 lg:w-[13vw]" />
          </div>
        </div>
      ))}
    </div>
  );
}
