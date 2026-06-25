"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { DetailDialog } from "@/components/ui/detail-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { showToast } from "@/components/ui/toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "@/lib/format"
import { MessageBubble, DayDivider, type DisplayMessage } from "@/components/messaging/message-bubble"
import { MessageComposer } from "@/components/messaging/message-composer"
import { useConversationStream } from "@/components/messaging/use-conversation-stream"
import type { AdminSupportRow, AdminSupportThread, SupportThreadMessage } from "@/lib/data/support"
import {
  adminReplySupport,
  assignSupportToMe,
  getAdminSupportThreadAction,
  setSupportPriority,
  setSupportStatus,
} from "@/lib/actions/support"
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUS_PILL,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/constants"
import { SearchBox, Th, Td, Pill } from "./leads-table"

const PRIORITY_TEXT: Record<TicketPriority, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-amber-600 dark:text-amber-400",
  urgent: "text-red-600 dark:text-red-400",
}

export function SupportInbox({ threads }: { threads: AdminSupportRow[] }) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all")
  const [open, setOpen] = useState<AdminSupportRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return threads.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (!q) return true
      return [t.ref, t.requesterName, t.requesterEmail, t.lastPreview]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [threads, query, statusFilter])

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex flex-wrap items-center gap-3 lg:gap-[0.833vw]">
        <SearchBox value={query} onChange={setQuery} placeholder="Search support…" />
        <FilterDropdown value={statusFilter} onChange={setStatusFilter} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState size="sm" icon="chat" title="No threads" description="Support conversations will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm lg:text-[0.903vw]">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Ref</Th>
                <Th>Requester</Th>
                <Th>Last message</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Assignee</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr
                  key={t.ticketId}
                  onClick={() => setOpen(t)}
                  className="cursor-pointer align-middle transition-colors hover:bg-muted/40"
                >
                  <Td className="pl-5 lg:pl-[1.528vw] font-medium text-foreground">{t.ref}</Td>
                  <Td className="text-muted-foreground">
                    {t.requesterName ?? t.requesterEmail}
                    <span className="ml-1 lg:ml-[0.278vw] capitalize text-muted-foreground/70">· {t.requesterRole}</span>
                  </Td>
                  <Td className="max-w-[20rem] truncate text-muted-foreground">{t.lastPreview ?? "—"}</Td>
                  <Td className={cn("font-medium", PRIORITY_TEXT[t.priority])}>{PRIORITY_LABEL[t.priority]}</Td>
                  <Td><Pill label={STATUS_LABEL[t.status]} cls={STATUS_PILL[t.status]} /></Td>
                  <Td className="text-muted-foreground">{t.assignedAdminName ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(t.lastMessageAt))}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDialog
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open ? `Support · ${open.ref}` : "Support"}
        headerExtra={
          open ? (
            <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
              {open.requesterName ?? open.requesterEmail} · {open.requesterRole}
            </p>
          ) : null
        }
      >
        {open ? <AdminThreadBody row={open} /> : null}
      </DetailDialog>
    </div>
  )
}

function toDisplay(m: SupportThreadMessage, requesterId: string): DisplayMessage {
  return {
    id: m.id,
    senderType: m.isSystem ? "system" : "user",
    senderId: m.fromRequester ? requesterId : null,
    body: m.body,
    meta: m.meta,
    createdAt: m.createdAt,
    isMine: !m.isSystem && !m.fromRequester, // platform/admin messages on the right
  }
}

function AdminThreadBody({ row }: { row: AdminSupportRow }) {
  const router = useRouter()
  const [thread, setThread] = useState<AdminSupportThread | null>(null)
  const [loading, startLoad] = useTransition()
  const [acting, startAction] = useTransition()

  function reload() {
    startLoad(async () => setThread(await getAdminSupportThreadAction(row.conversationId)))
  }

  useEffect(() => {
    setThread(null)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.conversationId])

  useConversationStream(row.conversationId, () => reload())

  function reply(body: string) {
    if (!body.trim()) return
    startAction(async () => {
      const res = await adminReplySupport({ conversationId: row.conversationId, body: body.trim() })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      reload()
      router.refresh()
    })
  }

  function runControl(run: () => Promise<{ success: boolean; error?: string }>, okMsg: string) {
    startAction(async () => {
      const res = await run()
      if (!res.success) {
        showToast(res.error ?? "Something went wrong", { type: "error" })
        return
      }
      showToast(okMsg, { type: "success" })
      reload()
      router.refresh()
    })
  }

  const status = thread?.status ?? row.status
  const priority = thread?.priority ?? row.priority

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <section className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw] border-b border-border pb-4 lg:pb-[1.111vw]">
        <ValueDropdown
          label={STATUS_LABEL[status]}
          value={status}
          options={TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          disabled={acting}
          onChange={(v) => runControl(() => setSupportStatus({ conversationId: row.conversationId, status: v as TicketStatus }), "Status updated.")}
        />
        <ValueDropdown
          label={`Priority: ${PRIORITY_LABEL[priority]}`}
          value={priority}
          options={TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          disabled={acting}
          onChange={(v) => runControl(() => setSupportPriority({ conversationId: row.conversationId, priority: v as TicketPriority }), "Priority updated.")}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={acting}
          onClick={() => runControl(() => assignSupportToMe({ conversationId: row.conversationId }), "Assigned to you.")}
        >
          {thread?.assignedAdminName ? `Assigned: ${thread.assignedAdminName}` : "Assign to me"}
        </Button>
      </section>

      {/* Messages */}
      <div className="min-h-[40vh] flex-1 space-y-2 lg:space-y-[0.556vw] overflow-y-auto py-4 lg:py-[1.111vw]">
        {loading && !thread ? (
          <p className="py-8 text-center text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
        ) : !thread ? (
          <EmptyState size="sm" icon="danger-triangle" title="Couldn't load this thread" description="Close and try again." />
        ) : (
          thread.messages.map((m, i) => {
            const prev = thread.messages[i - 1]
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            return (
              <div key={m.id}>
                {newDay ? <DayDivider iso={m.createdAt} /> : null}
                <MessageBubble
                  message={toDisplay(m, row.requesterId)}
                  viewerType="user"
                  otherName={row.requesterName ?? row.requesterEmail}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border pt-3 lg:pt-[0.833vw]">
        <MessageComposer onSend={(body) => reply(body)} disabled={acting} />
      </div>
    </div>
  )
}

function FilterDropdown({
  value,
  onChange,
}: {
  value: TicketStatus | "all"
  onChange: (v: TicketStatus | "all") => void
}) {
  const label = value === "all" ? "All statuses" : STATUS_LABEL[value]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between font-normal min-w-44 lg:min-w-[12vw]">
          {label}
          <Icon name="down" className="size-4 lg:size-[1.111vw] text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as TicketStatus | "all")}>
          <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
          {TICKET_STATUSES.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ValueDropdown({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  disabled?: boolean
  onChange: (v: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} className="justify-between font-normal min-w-36 lg:min-w-[10vw]">
          {label}
          <Icon name="down" className="size-3.5 lg:size-[0.972vw] text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
