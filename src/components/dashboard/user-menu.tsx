"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
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
import { showToast } from "@/components/ui/toast";
import { signOutFormAction } from "@/lib/actions/auth";
import { switchWorkspace } from "@/lib/actions/workspace";

type UserMenuUser = {
  email: string;
  fullName: string;
  avatarUrl: string | null;
};

export type UserMenuWorkspace = {
  id: string;
  name: string;
  logoUrl: string | null;
};

type UserMenuProps = {
  user: UserMenuUser;
  settingsHref: string;
  /** Compact (avatar-only) trigger, opens downward — for the top header. */
  compact?: boolean;
  /**
   * Companies the user belongs to. When present (and non-compact), the menu
   * shows the active company as the trigger subtitle plus an in-menu workspace
   * switcher — mirroring the sidebar-footer account nav.
   */
  workspaces?: UserMenuWorkspace[];
  activeWorkspaceId?: string | null;
  /** "Company settings" target shown when `workspaces` is provided. */
  manageHref?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({
  user,
  settingsHref,
  compact = false,
  workspaces,
  activeWorkspaceId,
  manageHref,
}: UserMenuProps) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const currentTheme = mounted ? theme ?? "system" : "system";

  const activeWorkspace =
    workspaces?.find((w) => w.id === activeWorkspaceId) ?? workspaces?.[0] ?? null;
  // Trigger subtitle: active company for contractors, email otherwise.
  const subtitle = activeWorkspace?.name ?? user.email;

  function select(id: string) {
    if (id === activeWorkspace?.id || pending) return;
    start(async () => {
      const res = await switchWorkspace(id);
      if (!res.success) {
        showToast(res.error, { type: "error" });
        return;
      }
      // The active company drives the whole contractor tree, so land on the
      // dashboard root rather than a now-foreign detail page.
      router.push("/contractor");
      router.refresh();
    });
  }

  const avatar = (
    <Avatar className="size-8 lg:size-[2.222vw] shrink-0">
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-muted text-xs lg:text-[0.833vw] font-medium text-foreground/70">
        {initials(user.fullName)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label="Open account menu"
            className="flex size-8 lg:size-[2.222vw] items-center justify-center rounded-full outline-none ring-1 ring-border transition-shadow"
          >
            <Avatar className="w-full h-full">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-muted text-xs lg:text-[0.833vw] font-medium text-foreground/70">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            aria-label="Open account menu"
            className="flex w-full items-center gap-2.5 lg:gap-[0.694vw] rounded-md lg:rounded-[0.556vw] p-1.5 lg:p-[0.417vw] text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-70 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          >
            {avatar}
            <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm lg:text-[0.972vw] font-medium text-sidebar-foreground">
                {user.fullName}
              </span>
              <span className="truncate text-xs lg:text-[0.833vw] text-muted-foreground">
                {subtitle}
              </span>
            </span>
            <Icon
              name="swap"
              className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
            />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={compact ? "bottom" : "top"}
        align="end"
        sideOffset={8}
        className="w-64 lg:w-[17.778vw]"
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 lg:gap-[0.694vw] py-2 lg:py-[0.556vw]">
          {avatar}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm lg:text-[0.972vw] font-semibold text-foreground">
              {user.fullName}
            </span>
            <span className="truncate text-xs lg:text-[0.833vw] font-normal text-muted-foreground">
              {user.email}
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={settingsHref} className="flex items-center gap-2 lg:gap-[0.556vw]">
            <Icon name="setting" className="size-4 lg:size-[1.111vw]" />
            Account settings
          </Link>
        </DropdownMenuItem>

        {workspaces && workspaces.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-normal text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((w) => {
              const isActive = w.id === activeWorkspace?.id;
              const logo = (
                <Avatar className="size-6 lg:size-[1.667vw] shrink-0 rounded-md lg:rounded-[0.417vw]">
                  {w.logoUrl ? (
                    <AvatarImage
                      src={w.logoUrl}
                      alt=""
                      className="rounded-md lg:rounded-[0.417vw]"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-md lg:rounded-[0.417vw] bg-foreground text-[10px] lg:text-[0.694vw] font-semibold text-background">
                    {initials(w.name)}
                  </AvatarFallback>
                </Avatar>
              );

              // Active row: highlighted, with a gear that opens its settings.
              // Others: selecting the row switches into that company.
              if (isActive) {
                const content = (
                  <>
                    {logo}
                    <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                    {manageHref ? (
                      <Icon
                        name="setting"
                        className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground"
                      />
                    ) : null}
                  </>
                );
                return manageHref ? (
                  <DropdownMenuItem
                    key={w.id}
                    asChild
                    className="gap-2.5 lg:gap-[0.694vw] bg-accent/60"
                  >
                    <Link href={manageHref} aria-label={`${w.name} settings`}>
                      {content}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    key={w.id}
                    disabled
                    className="gap-2.5 lg:gap-[0.694vw] bg-accent/60 opacity-100"
                  >
                    {content}
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={w.id}
                  disabled={pending}
                  className="gap-2.5 lg:gap-[0.694vw]"
                  onSelect={(e) => {
                    e.preventDefault();
                    select(w.id);
                  }}
                >
                  {logo}
                  <span className="min-w-0 flex-1 truncate">{w.name}</span>
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 lg:gap-[0.556vw]">
            <Icon
              name={currentTheme === "dark" ? "moon" : "sun"}
              className="size-4 lg:size-[1.111vw]"
            />
            Theme
            {/* <span className="ml-auto text-xs lg:text-[0.833vw] capitalize text-muted-foreground">
              {currentTheme}
            </span> */}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 lg:w-[12.222vw]">
            <DropdownMenuRadioGroup value={currentTheme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light" className="gap-2 lg:gap-[0.556vw]">
                <Icon name="sun" className="size-4 lg:size-[1.111vw]" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="gap-2 lg:gap-[0.556vw]">
                <Icon name="moon" className="size-4 lg:size-[1.111vw]" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="gap-2 lg:gap-[0.556vw]">
                <Icon name="monitor" className="size-4 lg:size-[1.111vw]" />
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
              className="flex w-full items-center gap-2 lg:gap-[0.556vw] text-destructive focus:text-destructive"
            >
              <Icon name="logout" className="size-4 lg:size-[1.111vw]" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
