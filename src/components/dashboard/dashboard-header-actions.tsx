"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";

const ICON_BTN =
  "flex size-9 items-center justify-center rounded-full text-foreground/65 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DashboardHeaderActions({
  user,
  settingsHref,
  credits,
}: {
  user: { email: string; fullName: string; avatarUrl: string | null };
  settingsHref: string;
  credits: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/dashboard/settings"
        title="Buy credits"
        className="flex items-center gap-1.5 rounded-full bg-secondary/70 px-3 py-1.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary"
      >
        <CoinIcon />
        <span className="tabular-nums">{credits}</span>
        <span className="hidden text-secondary-foreground/65 sm:inline">credits</span>
      </Link>
      <HeaderThemeToggle />
      <NotificationBell />
      <span className="mx-1 h-5 w-px bg-border" />
      <UserMenu user={user} settingsHref={settingsHref} compact />
    </div>
  );
}

// next-themes resolves the theme only on the client, so the toggle renders
// different markup on server vs. client. Gate it behind a mount flag so the
// first client render matches the SSR placeholder (no hydration mismatch).
function HeaderThemeToggle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="size-9 shrink-0" aria-hidden />;
  return (
    <ThemeToggleButton className="size-9 bg-transparent p-2 text-foreground/65 hover:bg-muted hover:text-foreground" />
  );
}

function NotificationBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Notifications" className={ICON_BTN}>
          <BellIcon />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72">
        <p className="text-sm font-semibold">Notifications</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You’re all caught up. New leads and updates will show up here.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function CoinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 5.6v6.8M7.2 7.1c0-.8.8-1.3 1.8-1.3s1.8.5 1.8 1.3-.8 1.2-1.8 1.2-1.8.5-1.8 1.3.8 1.3 1.8 1.3 1.8-.5 1.8-1.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 8.5a4 4 0 1 1 8 0c0 3 1 4.2 1.6 4.8.3.3.1.7-.3.7H4.7c-.4 0-.6-.4-.3-.7C5 12.7 6 11.5 6 8.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 16.2a1.6 1.6 0 0 0 3 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
