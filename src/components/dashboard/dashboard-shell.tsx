"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { SVGIcon } from "@/components/ui/svg-icon";
import { Icon } from "@/components/ui/icon";
import { formatUnreadBadge } from "@/utils/format/unread";
import {
  type DashboardNavItem,
  isDashboardNavActive,
} from "@/components/dashboard/dashboard-nav";
import { useTotalUnread, useViewerId } from "@/components/chat/chat-store";

export type DashboardShellUser = {
  email: string;
  fullName: string;
  avatarUrl: string | null;
};

export type DashboardShellProps = {
  navItems: DashboardNavItem[];
  brandHref?: string;
  brandLabel?: string;
  /** Status / announcement card rendered at the bottom of the sidebar. */
  notice?: React.ReactNode;
  /** Unread totals keyed by nav `href` (e.g. `/contractor/chat`). */
  navUnreadCounts?: Partial<Record<string, number>>;
  /**
   * When set, the badge for this href is driven by the reactive chat
   * store (so it updates live as new messages arrive without a full
   * page refresh). SSR value from `navUnreadCounts` is used until the
   * store hydrates, then the store value takes over.
   */
  messagesHref?: string;
  /** Slot rendered on the right of the inset header (e.g. NotificationBell). */
  topRight?: React.ReactNode;
  /** Slot rendered under the brand in the sidebar (e.g. the workspace chip). */
  workspace?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardShell({
  navItems,
  brandHref = "/",
  brandLabel = "Homei",
  notice,
  navUnreadCounts,
  messagesHref,
  topRight,
  workspace,
  children,
}: DashboardShellProps) {
  const pathname = usePathname() ?? "";
  // Reactive chat badge. While the store is pre-hydration (viewer id
  // unknown) we fall back to the server-computed count so the first
  // paint matches SSR. Once hydrated, updates are instant across the
  // whole app — not just the messages page.
  const storeViewerId = useViewerId();
  const storeTotalUnread = useTotalUnread();
  const getUnreadForHref = (href: string) => {
    if (messagesHref && href === messagesHref) {
      return storeViewerId === null
        ? navUnreadCounts?.[href] ?? 0
        : storeTotalUnread;
    }
    return navUnreadCounts?.[href] ?? 0;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="sidebar">
          {/* Logo at top */}
          <SidebarHeader className="px-3 lg:px-[0.833vw] pt-4 lg:pt-[1.111vw] pb-3 lg:pb-[0.833vw]">
            <Link
              href={brandHref}
              prefetch
              aria-label={brandLabel}
              className="flex items-center gap-2.5 lg:gap-[0.694vw] outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-md lg:rounded-[0.556vw]"
            >
              <SVGIcon
                src="/icons/logo.svg"
                className="size-5 lg:size-[1.389vw] text-sidebar-primary"
              />
              <span className="truncate text-base lg:text-[1.111vw] font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                {brandLabel}
              </span>
            </Link>
            {workspace ? (
              <div className="mt-3 lg:mt-[0.833vw]">{workspace}</div>
            ) : null}
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const active = isDashboardNavActive(pathname, item.href);
                    const unread = getUnreadForHref(item.href);
                    const unreadLabel = formatUnreadBadge(unread);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className="text-sidebar-foreground/70 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-foreground data-active:font-medium data-active:shadow-[var(--shadow-xs)]"
                        >
                          <Link
                            href={item.href}
                            prefetch
                            className="flex w-full min-w-0 items-center gap-2.5 lg:gap-[0.694vw]"
                          >
                            <Icon
                              name={item.icon}
                              className="size-5 lg:size-[1.389vw] shrink-0"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {item.label}
                            </span>
                            {unreadLabel ? (
                              <Badge
                                variant="secondary"
                                className="ml-auto shrink-0 border-transparent bg-sidebar-foreground/15 text-sidebar-foreground tabular-nums group-data-[collapsible=icon]:hidden"
                              >
                                {unreadLabel}
                              </Badge>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Status / announcement at bottom */}
          <SidebarFooter className="px-2 lg:px-[0.556vw] pb-3 lg:pb-[0.833vw] pt-1 lg:pt-[0.278vw]">{notice}</SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-0 flex-1 overflow-hidden bg-background">
          <header className="flex h-14 lg:h-[3.889vw] shrink-0 items-center gap-2 lg:gap-[0.556vw] border-b border-border bg-background px-4 lg:px-[1.111vw]">
            <SidebarTrigger className="md:hidden" />
            <div className="ml-auto flex items-center gap-2 lg:gap-[0.556vw]">{topRight}</div>
          </header>

          <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-6 lg:p-[1.667vw]">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
