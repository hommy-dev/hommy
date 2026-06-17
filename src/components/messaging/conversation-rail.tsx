"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import type { ConversationSummary } from "@/lib/data/conversations";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ParticipantAvatar } from "./participant-avatar";

/**
 * The conversation rail: search box + the list of conversations. Holds the
 * client-side search filter. Rendered inside MessagesShell's <aside> and fed by
 * an async loader under a <Suspense> boundary, so the list streams in while the
 * shell (and the open thread) paint immediately.
 */
export function ConversationRail({
  conversations,
  basePath,
}: {
  conversations: ConversationSummary[];
  basePath: string;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      [c.otherName, c.lastMessageBody].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [conversations, query]);

  return (
    <>
      <div className="space-y-3 lg:space-y-[0.833vw] border-b border-border p-4 lg:p-[1.111vw]">
        <h1 className="font-semibold lg:text-[1.111vw]">Messages</h1>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-9 lg:pl-[2.5vw] pr-3 lg:pr-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-6 lg:p-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">
            {query
              ? "No matches."
              : `No conversations yet. They’ll appear here once you connect with ${basePath.includes("homeowner") ? "a contractor" : "a homeowner"}.`}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const active = pathname === `${basePath}/${c.id}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`${basePath}/${c.id}`}
                    className={cn(
                      "flex items-center gap-3 lg:gap-[0.833vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] transition-colors hover:bg-muted/40",
                      active && "bg-muted/60",
                    )}
                  >
                    <ParticipantAvatar name={c.otherName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 lg:gap-[0.556vw]">
                        <p
                          className={cn(
                            "truncate text-sm lg:text-[0.972vw]",
                            c.hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground",
                          )}
                        >
                          {c.otherName}
                        </p>
                        {c.lastMessageAt ? (
                          <span className="shrink-0 text-xs lg:text-[0.764vw] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.lastMessageAt))}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "truncate text-xs lg:text-[0.833vw]",
                          c.hasUnread ? "text-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {c.lastMessageBody ?? "No messages yet"}
                      </p>
                    </div>
                    {c.hasUnread ? (
                      <span aria-label="Unread" className="size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary" />
                    ) : null}
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
