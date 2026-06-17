"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { sendMessage, markConversationRead } from "@/lib/actions/messages";
import { showToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble, DayDivider, type DisplayMessage } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { ParticipantAvatar } from "./participant-avatar";
import { JobControlPanel } from "./job-control-panel";
import { useConversationStream } from "./use-conversation-stream";
import {
  useSummary,
  useThreadState,
  loadThread,
  appendMessage,
  patchMessages,
} from "./messaging-store";

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/**
 * The persistent right-pane thread. It lives in the messages layout (not a
 * per-conversation route), so switching conversations is a client state change:
 * the header (from the rail's cached summary) and composer paint instantly, and
 * only the message list loads — from cache if the thread was already visited.
 */
export function ThreadView({ basePath, userId }: { basePath: string; userId: string }) {
  const pathname = usePathname();
  const activeId = pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length + 1)
    : null;

  const summary = useSummary(activeId);
  const thread = useThreadState(activeId);
  const me = thread?.me ?? null;
  const messages = useMemo(() => thread?.messages ?? [], [thread?.messages]);
  const loadingMessages = thread?.status === "loading" && messages.length === 0;

  const endRef = useRef<HTMLDivElement>(null);
  const tempCounter = useRef(0);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load (and revalidate) whenever the active conversation changes.
  useEffect(() => {
    if (activeId) void loadThread(activeId);
  }, [activeId]);

  const scheduleMarkRead = useCallback(() => {
    if (!activeId) return;
    const id = activeId;
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    markReadTimer.current = setTimeout(() => {
      void markConversationRead(id).catch(() => {});
    }, 800);
  }, [activeId]);

  // Mark read once messages are present; clean up on switch/unmount.
  useEffect(() => {
    if (activeId && messages.length) scheduleMarkRead();
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    };
  }, [activeId, scheduleMarkRead, messages.length]);

  // Keep pinned to the newest message (and on conversation switch).
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, activeId]);

  // Live messages for the open conversation.
  useConversationStream(activeId ?? "", (incoming) => {
    if (!activeId) return;
    const mine = me ? incoming.senderType === me.type && incoming.senderId === me.id : false;
    appendMessage(activeId, { ...incoming, isMine: mine });
    if (!mine) scheduleMarkRead();
  });

  const handleSend = useCallback(
    (body: string) => {
      if (!activeId) return;
      const id = activeId;
      const tempId = `temp-${tempCounter.current++}`;
      const optimistic: DisplayMessage = {
        id: tempId,
        senderType: me?.type ?? "user",
        senderId: me?.id ?? userId,
        body,
        meta: null,
        createdAt: new Date().toISOString(),
        isMine: true,
        pending: true,
      };
      patchMessages(id, (prev) => [...prev, optimistic]);

      void (async () => {
        const res = await sendMessage(id, body);
        if (res.ok) {
          const real = res.message;
          patchMessages(id, (prev) => {
            const without = prev.filter((m) => m.id !== tempId);
            return without.some((m) => m.id === real.id)
              ? without
              : [...without, { ...real, isMine: true }];
          });
        } else {
          patchMessages(id, (prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
          );
          showToast(res.message, { type: "error" });
        }
      })();
    },
    [activeId, me, userId],
  );

  if (!activeId) {
    return (
      <div className="grid h-full w-full flex-1 place-items-center p-10 lg:p-[2.778vw] text-center">
        <div className="space-y-2 lg:space-y-[0.556vw]">
          <MessageSquare
            className="mx-auto size-8 lg:size-[2.222vw] text-muted-foreground/60"
            strokeWidth={1.5}
          />
          <p className="font-medium lg:text-[1.042vw]">Select a conversation</p>
          <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
            Pick a chat from the left to start messaging.
          </p>
        </div>
      </div>
    );
  }

  const name = summary?.otherName ?? "";
  const kind = summary?.otherKind ?? "homeowner";

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 lg:gap-[0.833vw] border-b border-border px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw]">
        <Link
          href={basePath}
          aria-label="Back to messages"
          className="-ml-1 grid size-8 lg:size-[2.222vw] shrink-0 place-items-center rounded-md lg:rounded-[0.556vw] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="size-5 lg:size-[1.389vw]" strokeWidth={2} />
        </Link>
        <ParticipantAvatar name={name || "?"} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm lg:text-[0.972vw] font-semibold">
            {name || "Loading…"}
          </p>
          <p className="truncate text-xs lg:text-[0.764vw] text-muted-foreground">
            {kind === "contractor" ? "Contractor" : "Homeowner"}
          </p>
        </div>
        {thread?.panel ? (
          <div className="ml-auto">
            <JobControlPanel panel={thread.panel} />
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-2 lg:space-y-[0.556vw] overflow-y-auto px-4 lg:px-[1.111vw] py-4 lg:py-[1.111vw]">
          {loadingMessages ? (
            <ThreadMessagesLoading />
          ) : messages.length === 0 ? (
            <p className="py-10 lg:py-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
              No messages yet. Say hello.
            </p>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDay = !prev || !sameDay(prev.createdAt, m.createdAt);
              return (
                <Fragment key={m.id}>
                  {showDay ? <DayDivider iso={m.createdAt} /> : null}
                  <MessageBubble message={m} viewerType={me?.type} otherName={name} />
                </Fragment>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        <MessageComposer onSend={handleSend} />
      </div>
    </div>
  );
}

/** Slim placeholder shown only in the message area on a cold first open. */
function ThreadMessagesLoading() {
  const rows = [
    { mine: false, w: "w-40 lg:w-[14vw]" },
    { mine: true, w: "w-52 lg:w-[18vw]" },
    { mine: false, w: "w-32 lg:w-[10vw]" },
    { mine: true, w: "w-44 lg:w-[15vw]" },
  ];
  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {rows.map((r, i) => (
        <div key={i} className={r.mine ? "flex justify-end" : "flex justify-start"}>
          <Skeleton className={`h-12 lg:h-[3.333vw] ${r.w} rounded-2xl lg:rounded-[1.111vw]`} />
        </div>
      ))}
    </div>
  );
}
