"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { switchWorkspace } from "@/lib/actions/workspace"
import { showToast } from "@/components/ui/toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SVGIcon } from "@/components/ui/svg-icon"
import { Icon } from "@/components/ui/icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type WorkspaceCompany = { id: string; name: string; logoUrl: string | null }

// Sidebar workspace chip. Lists every company the user belongs to and switches
// the active one (persisted to users.active_contractor_id).
export function WorkspaceChip({
  activeId,
  companies,
  manageHref,
}: {
  activeId: string
  companies: WorkspaceCompany[]
  manageHref: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const active =
    companies.find((c) => c.id === activeId) ?? companies[0]
  if (!active) return null

  function select(id: string) {
    if (id === active.id || pending) return
    start(async () => {
      const res = await switchWorkspace(id)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      router.push("/contractor")
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="flex w-full items-center gap-2.5 lg:gap-[0.694vw] rounded-md lg:rounded-[0.556vw] border border-sidebar-border bg-sidebar-accent/40 px-2 lg:px-[0.556vw] py-1.5 lg:py-[0.417vw] text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-70 group-data-[collapsible=icon]:hidden"
        >
          <CompanyAvatar c={active} />
          <span className="min-w-0 flex-1 truncate text-sm lg:text-[0.972vw] font-medium text-sidebar-foreground">
            {active.name}
          </span>
          <SVGIcon
            src="/icons/arrow-down.svg"
            className="size-4 lg:size-[1.111vw] shrink-0 text-sidebar-foreground/50"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-60 lg:w-[16.667vw]"
      >
        <DropdownMenuLabel className="text-xs lg:text-[0.833vw] text-muted-foreground">
          {companies.length > 1 ? "Switch workspace" : "Workspace"}
        </DropdownMenuLabel>

        {companies.map((c) => {
          const isActive = c.id === active.id
          return (
            <DropdownMenuItem
              key={c.id}
              className="gap-2.5 lg:gap-[0.694vw]"
              onSelect={(e) => {
                if (isActive) return
                e.preventDefault()
                select(c.id)
              }}
            >
              <CompanyAvatar c={c} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {isActive ? (
                <Icon name="tick-square" className="size-4 lg:size-[1.111vw] text-primary" />
              ) : null}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={manageHref} className="flex items-center gap-2 lg:gap-[0.556vw]">
            <Icon name="setting" className="size-4 lg:size-[1.111vw]" />
            Company settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CompanyAvatar({ c }: { c: WorkspaceCompany }) {
  return (
    <Avatar className="size-7 lg:size-[1.944vw] rounded-md lg:rounded-[0.417vw]">
      {c.logoUrl ? (
        <AvatarImage src={c.logoUrl} alt="" className="rounded-md lg:rounded-[0.417vw]" />
      ) : null}
      <AvatarFallback className="rounded-md lg:rounded-[0.417vw] bg-muted text-[11px] lg:text-[0.764vw] font-semibold text-foreground/70">
        {initials(c.name)}
      </AvatarFallback>
    </Avatar>
  )
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return "?"
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
