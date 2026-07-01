"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderThemeToggle } from "@/components/dashboard/header-theme-toggle";
import { Icon } from "@/components/ui/icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardHeaderActions({
  userId,
  unreadCount = 0,
  credits,
}: {
  userId: string;
  unreadCount?: number;
  credits: number;
}) {
  return (
    <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
      <Link
        href="/contractor/settings"
        title="Buy credits"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Icon name="wallet" className="size-[15px] lg:size-[1.042vw]" />
        <span className="tabular-nums">{credits}</span>
        <span className="hidden text-foreground sm:inline">credits</span>
      </Link>
      <HeaderThemeToggle />
      <NotificationBell userId={userId} initialUnreadCount={unreadCount} />
    </div>
  );
}
