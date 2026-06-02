"use client";

import Link from "next/link";
import * as React from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  Logout03Icon,
  Moon02Icon,
  Sun03Icon,
  UserSettings01Icon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOutFormAction } from "@/lib/actions/auth";

type UserMenuUser = {
  email: string;
  fullName: string;
  avatarUrl: string | null;
};

type UserMenuProps = {
  user: UserMenuUser;
  settingsHref: string;
  /** Compact (avatar-only) trigger, opens downward — for the top header. */
  compact?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ user, settingsHref, compact = false }: UserMenuProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const currentTheme = mounted ? theme ?? "system" : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className="flex size-9 items-center justify-center rounded-full outline-none ring-1 ring-border transition-shadow hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar size="sm" className="size-8">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-muted text-xs font-medium text-foreground/70">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={compact ? "bottom" : "top"}
        align="end"
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {user.fullName}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={settingsHref} className="flex items-center gap-2">
            <HugeiconsIcon icon={UserSettings01Icon} strokeWidth={2} className="size-4" />
            Account settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <HugeiconsIcon
              icon={currentTheme === "dark" ? Moon02Icon : Sun03Icon}
              strokeWidth={2}
              className="size-4"
            />
            Theme
            <span className="ml-auto text-xs capitalize text-muted-foreground">
              {currentTheme}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup value={currentTheme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light" className="gap-2">
                <HugeiconsIcon icon={Sun03Icon} strokeWidth={2} className="size-4" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="gap-2">
                <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} className="size-4" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="gap-2">
                <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} className="size-4" />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <form action={signOutFormAction}>
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-destructive focus:text-destructive"
            >
              <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} className="size-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
