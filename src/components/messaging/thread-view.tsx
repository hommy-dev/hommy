"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { sendMessage, markConversationRead } from "@/lib/actions/messages";
import { uploadChatAttachment } from "@/lib/cloudinary/chat-upload";
import type { ChatAttachment } from "@/lib/db/schema";
import { showToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { markReadOptimistic } from "@/components/dashboard/unread-store";
import { MessageBubble, DayDivider, type DisplayMessage } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { ParticipantAvatar } from "./participant-avatar";
import { JobControlPanel } from "./job-control-panel";
import { useConversationStream } from "./use-conversation-stream";
import {
  useSummary,
  useThreadState,
  useInboxCount,
  loadThread,
  appendMessage,
  patchMessages,
} from "./messaging-store";

/**
 * Why the viewer's inbox is empty, computed server-side in the messages layout
 * (so the right pane never flashes a wrong message before the rail loads):
 *  - homeowner-no-job  → they haven't posted a job yet
 *  - homeowner-waiting → posted a job, but no pro has reached out yet
 *  - contractor-no-chats → haven't engaged any leads yet
 * Null means they already have conversations.
 */
export type InboxEmptyKind =
  | "homeowner-no-job"
  | "homeowner-waiting"
  | "contractor-no-chats";

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/**
 * The persistent right-pane thread. It lives in the messages layout (not a
 * per-conversation route), so switching conversations is a client state change:
 * the header (from the rail's cached summary) and composer paint instantly, and
 * only the message list loads — from cache if the thread was already visited.
 */
export function ThreadView({
  basePath,
  userId,
  emptyInbox,
}: {
  basePath: string;
  userId: string;
  emptyInbox: InboxEmptyKind | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
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
  const optimisticReadId = useRef<string | null>(null);

  // Load (and revalidate) whenever the active conversation changes.
  useEffect(() => {
    if (activeId) void loadThread(activeId);
  }, [activeId]);

  const scheduleMarkRead = useCallback(() => {
    if (!activeId) return;
    const id = activeId;
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    markReadTimer.current = setTimeout(() => {
      // Reconcile the authoritative sidebar count after the read commits (the
      // optimistic decrement already cleared it instantly).
      void markConversationRead(id)
        .then((res) => {
          if (res?.ok) router.refresh();
        })
        .catch(() => {});
    }, 800);
  }, [activeId, router]);

  // Mark read once messages are present; clean up on switch/unmount.
  useEffect(() => {
    if (activeId && messages.length) {
      scheduleMarkRead();
      // Optimistically clear this conversation from the sidebar badge the moment
      // it's opened (once per conversation), if it was unread.
      if (optimisticReadId.current !== activeId && summary?.hasUnread) {
        optimisticReadId.current = activeId;
        markReadOptimistic(activeId, true);
      }
    }
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    };
  }, [activeId, scheduleMarkRead, messages.length, summary?.hasUnread]);

  // Keep pinned to the newest message (and on conversation switch).
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, activeId]);

  // Live messages for the open conversation.
  useConversationStream(activeId ?? "", (incoming) => {
    if (!activeId) return;
    const mine = me ? incoming.senderType === me.type && incoming.senderId === me.id : false;
    appendMessage(activeId, { ...incoming, isMine: mine });
    // A lifecycle message (quote sent/accepted/superseded, job completed, …)
    // changes the job state, so refetch the panel + message meta — this is what
    // makes the header actions (Accept / Mark completed), the timeline, and the
    // quote-card status update LIVE for both parties without a manual reload.
    const lifecycle =
      incoming.senderType === "system" ||
      incoming.meta?.kind === "event" ||
      incoming.meta?.kind === "quote";
    if (lifecycle) void loadThread(activeId);
    if (!mine) scheduleMarkRead();
  });

  const handleSend = useCallback(
    (body: string, files: File[] = []) => {
      if (!activeId) return;
      const id = activeId;
      const tempId = `temp-${tempCounter.current++}`;

      // Build local previews so the bubble appears instantly with thumbnails,
      // then upload in the background and swap in the real Cloudinary URLs.
      const localUrls: string[] = [];
      const localFiles: ChatAttachment[] = files.map((file, i) => {
        const url = URL.createObjectURL(file);
        localUrls.push(url);
        const resourceType: ChatAttachment["resourceType"] = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : "raw";
        return {
          url,
          publicId: `local-${tempId}-${i}`,
          resourceType,
          name: file.name,
          bytes: file.size,
          format: null,
        };
      });

      const optimistic: DisplayMessage = {
        id: tempId,
        senderType: me?.type ?? "user",
        senderId: me?.id ?? userId,
        body,
        meta: localFiles.length ? { kind: "attachment", files: localFiles } : null,
        createdAt: new Date().toISOString(),
        isMine: true,
        pending: true,
      };
      patchMessages(id, (prev) => [...prev, optimistic]);

      const fail = () => {
        patchMessages(id, (prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        );
      };

      void (async () => {
        try {
          // Upload happens now (on send), not when files were picked — saves
          // storage on files the user picked then removed.
          const uploaded = await Promise.all(
            files.map((file) => uploadChatAttachment({ file, conversationId: id })),
          );
          const res = await sendMessage(id, body, uploaded);
          if (res.ok) {
            const real = res.message;
            patchMessages(id, (prev) => {
              const without = prev.filter((m) => m.id !== tempId);
              return without.some((m) => m.id === real.id)
                ? without
                : [...without, { ...real, isMine: true }];
            });
            localUrls.forEach((u) => URL.revokeObjectURL(u)); // real URLs now in use
          } else {
            fail();
            showToast(res.message, { type: "error" });
          }
        } catch (err) {
          console.error("[thread] attachment send failed", err);
          fail();
          showToast("Couldn't upload your attachment. Please try again.", { type: "error" });
        }
      })();
    },
    [activeId, me, userId],
  );

  if (!activeId) {
    return <InboxEmptyPanel emptyInbox={emptyInbox} />;
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
          <Icon name="arrow-left" className="size-5 lg:size-[1.389vw]" />
        </Link>
        {name ? (
          <>
            <ParticipantAvatar name={name} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm lg:text-[0.972vw] font-semibold">{name}</p>
              <p className="truncate text-xs lg:text-[0.764vw] text-muted-foreground">
                {kind === "contractor" ? "Contractor" : "Homeowner"}
              </p>
            </div>
          </>
        ) : (
          // Header info not resolved yet (deep-link before the rail published it) —
          // skeletons for the avatar + name/role, not a "?" avatar and "Loading…".
          <>
            <Skeleton className="size-9 lg:size-[2.5vw] shrink-0 rounded-full" />
            <div className="space-y-1.5 lg:space-y-[0.417vw]">
              <Skeleton className="h-3.5 lg:h-[0.972vw] w-28 lg:w-[8vw]" />
              <Skeleton className="h-3 lg:h-[0.833vw] w-16 lg:w-[4.5vw]" />
            </div>
          </>
        )}
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
            thread?.panel?.viewerRole === "contractor" && thread.panel.canQuote ? (
              <div className="py-10 lg:py-[2.778vw] text-center">
                <p className="text-sm lg:text-[0.972vw] font-medium">You’re connected</p>
                <p className="mx-auto mt-1 lg:mt-[0.278vw] max-w-sm lg:max-w-[24vw] text-sm lg:text-[0.903vw] text-muted-foreground">
                  Introduce yourself and send a quote. Homeowners hire fastest when a quote
                  lands within a day.
                </p>
              </div>
            ) : (
              <p className="py-10 lg:py-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
                No messages yet. Say hello.
              </p>
            )
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDay = !prev || !sameDay(prev.createdAt, m.createdAt);
              return (
                <Fragment key={m.id}>
                  {showDay ? <DayDivider iso={m.createdAt} /> : null}
                  <MessageBubble
                    message={m}
                    viewerType={me?.type}
                    otherName={name}
                    reviewState={
                      thread?.panel
                        ? {
                            submitted: thread.panel.detail.reviewSubmitted,
                            rating: thread.panel.detail.reviewRating,
                            canReview: thread.panel.canReview,
                          }
                        : undefined
                    }
                  />
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

/**
 * Right-pane state when no conversation is open. If the viewer has conversations
 * (just none selected), it nudges them to pick one. If their inbox is genuinely
 * empty, it explains *why* and points them at the next step — different copy for
 * a homeowner who hasn't posted, one who's waiting on pros, and a contractor who
 * hasn't engaged a lead. The live count wins once the rail loads; until then we
 * trust the server-computed reason so nothing flashes.
 */
function InboxEmptyPanel({ emptyInbox }: { emptyInbox: InboxEmptyKind | null }) {
  const inbox = useInboxCount();
  const hasConversations = inbox.loaded ? inbox.count > 0 : emptyInbox == null;

  return (
    <div className="grid h-full w-full flex-1 place-items-center p-8 lg:p-[2.222vw]">
      {hasConversations ? (
        <EmptyState
          bordered={false}
          icon="chat"
          title="Select a conversation"
          description="Pick a chat from the left to read it and reply."
        />
      ) : emptyInbox === "homeowner-no-job" ? (
        <EmptyState
          bordered={false}
          icon="paper"
          title="No messages yet"
          description="You haven't posted a job yet. Post one and local pros can reach out to you right here."
          action={
            <Button asChild size="lg">
              <Link href="/get-a-quote">
                <Icon name="plus" />
                Post a job
              </Link>
            </Button>
          }
        />
      ) : emptyInbox === "homeowner-waiting" ? (
        <EmptyState
          bordered={false}
          icon="time-circle"
          title="Hang tight, your job is live"
          description="Pros are looking at your job now. The moment one reaches out, your chat opens right here."
          action={
            <Button asChild variant="outline" size="lg">
              <Link href="/homeowner">View your jobs</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          bordered={false}
          icon="chat"
          title="No conversations yet"
          description="When you engage a lead, the chat opens here. Jump on new leads fast to win more jobs."
          action={
            <Button asChild size="lg">
              <Link href="/contractor/jobs">View leads</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

/**
 * Placeholder shown in the message area on a cold first open. Mirrors the real
 * thread: incoming rows carry an avatar, bubbles use the same radius + sizes, and
 * heights vary by 1–2 lines — so it doesn't visibly jump when messages paint in.
 */
function ThreadMessagesLoading() {
  const rows = [
    { mine: false, w: "w-44 lg:w-[15vw]", h: "h-14 lg:h-[3.6vw]" },
    { mine: true, w: "w-36 lg:w-[12vw]", h: "h-9 lg:h-[2.4vw]" },
    { mine: false, w: "w-28 lg:w-[9vw]", h: "h-9 lg:h-[2.4vw]" },
    { mine: true, w: "w-52 lg:w-[17vw]", h: "h-14 lg:h-[3.6vw]" },
    { mine: false, w: "w-40 lg:w-[13vw]", h: "h-9 lg:h-[2.4vw]" },
  ];
  return (
    <div className="space-y-2 lg:space-y-[0.556vw]">
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            "flex items-end gap-2 lg:gap-[0.556vw]",
            r.mine ? "justify-end" : "justify-start",
          )}
        >
          {!r.mine ? (
            <Skeleton className="size-7 lg:size-[2vw] shrink-0 self-end rounded-full" />
          ) : null}
          <Skeleton className={cn(r.h, r.w, "rounded-lg lg:rounded-[0.694vw]")} />
        </div>
      ))}
    </div>
  );
}
