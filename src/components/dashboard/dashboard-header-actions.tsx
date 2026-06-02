"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserMenu } from "@/components/dashboard/user-menu";

const ICON_BTN =
  "flex size-9 items-center justify-center rounded-full text-foreground/65 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DashboardHeaderActions({
  user,
  settingsHref,
}: {
  user: { email: string; fullName: string; avatarUrl: string | null };
  settingsHref: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <NotificationBell />
      <span className="mx-1 h-5 w-px bg-border" />
      <UserMenu user={user} settingsHref={settingsHref} compact />
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={ICON_BTN}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
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

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2.5v1.6M10 15.9v1.6M3.6 3.6l1.1 1.1M15.3 15.3l1.1 1.1M2.5 10h1.6M15.9 10h1.6M3.6 16.4l1.1-1.1M15.3 4.7l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.5 11.8A6.5 6.5 0 0 1 8.2 3.5a6.5 6.5 0 1 0 8.3 8.3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
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
