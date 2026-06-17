"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Two-pane messaging inbox: a conversation rail on the left, the active thread on
 * the right. On mobile only one pane shows at a time (rail at the index route,
 * thread when one is open). The shell paints immediately; `rail` is streamed in
 * under a <Suspense> by the route layout, so the open thread doesn't wait behind
 * the inbox query.
 */
export function MessagesShell({
  rail,
  basePath,
  children,
}: {
  rail: React.ReactNode;
  basePath: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const threadOpen = pathname.startsWith(`${basePath}/`);

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] lg:h-[calc(100dvh-9vw)] overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-background">
      <aside
        className={cn(
          "w-full shrink-0 flex-col border-r border-border lg:flex lg:w-[24vw]",
          threadOpen ? "hidden lg:flex" : "flex",
        )}
      >
        {rail}
      </aside>

      <div className={cn("min-w-0 flex-1", threadOpen ? "flex" : "hidden lg:flex")}>
        {children}
      </div>
    </div>
  );
}
