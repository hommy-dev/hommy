"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { UserMenu } from "@/components/dashboard/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Icon } from "@/components/ui/icon";

const ICON_BTN =
  "flex size-9 lg:size-[2.5vw] items-center justify-center rounded-full text-foreground/65 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DashboardHeaderActions({
  user,
  userId,
  unreadCount = 0,
  settingsHref,
  credits,
}: {
  user: { email: string; fullName: string; avatarUrl: string | null };
  userId: string;
  unreadCount?: number;
  settingsHref: string;
  credits: number;
}) {
  return (
    <div className="flex items-center gap-1.5 lg:gap-[0.417vw]">
      <Link
        href="/contractor/settings"
        title="Buy credits"
        className="flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] border px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-sm lg:text-[0.972vw] font-semibold transition-colors hover:bg-accent"
      >
        <Icon name="wallet" className="size-[15px] lg:size-[1.042vw]" />
        <span className="tabular-nums">{credits}</span>
        <span className="hidden text-secondary-foreground/65 sm:inline">credits</span>
      </Link>
      <HeaderThemeToggle />
      <NotificationBell userId={userId} initialUnreadCount={unreadCount} />
      <span className="mx-1 lg:mx-[0.278vw] h-5 lg:h-[1.389vw] w-px lg:w-[0.069vw] bg-border" />
      <UserMenu user={user} settingsHref={settingsHref} compact />
    </div>
  );
}

// next-themes resolves the theme only on the client, so the toggle renders
// different markup on server vs. client. Gate it behind a mount flag so the
// first client render matches the SSR placeholder (no hydration mismatch).
function HeaderThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="size-9 lg:size-[2.5vw] shrink-0" aria-hidden />;
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={ICON_BTN}
    >
      <Icon name={isDark ? "moon" : "sun"} className="size-[18px] lg:size-[1.25vw]" />
    </button>
  );
}
