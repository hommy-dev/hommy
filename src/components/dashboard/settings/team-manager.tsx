"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  cancelInvitation,
  changeMemberRole,
  removeMember,
  resendInvitation,
  leaveCompany,
} from "@/lib/actions/team"
import type { MemberRole, TeamData } from "@/lib/data/team"
import { showToast } from "@/components/ui/toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { InviteDialog } from "./invite-dialog"
import { cn } from "@/lib/utils"

export function TeamManager({
  initial,
  viewerUserId,
  viewerRole,
  canManage,
}: {
  initial: TeamData
  viewerUserId: string
  viewerRole: MemberRole
  canManage: boolean
}) {
  const router = useRouter()
  const { members, invitations, seats } = initial
  const seatsLeft = seats.max - seats.used
  const ownersCount = members.filter((m) => m.role === "owner").length

  const [pendingRow, startRow] = useTransition()

  function onRole(userId: string, role: MemberRole) {
    startRow(async () => {
      const res = await changeMemberRole({ userId, role })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Role updated", { type: "success" })
      router.refresh()
    })
  }

  function onRemove(userId: string, name: string) {
    startRow(async () => {
      const res = await removeMember(userId)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast(`Removed ${name}`, { type: "success" })
      router.refresh()
    })
  }

  function onCancelInvite(id: string) {
    startRow(async () => {
      const res = await cancelInvitation(id)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Invitation cancelled", { type: "success" })
      router.refresh()
    })
  }

  function onResendInvite(id: string) {
    startRow(async () => {
      const res = await resendInvitation(id)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Invitation resent", { type: "success" })
      router.refresh()
    })
  }

  function onLeave() {
    startRow(async () => {
      const res = await leaveCompany()
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("You left the company", { type: "success" })
      router.push("/contractor")
      router.refresh()
    })
  }

  function copy(link: string) {
    navigator.clipboard?.writeText(link).then(
      () => showToast("Link copied", { type: "success" }),
      () => showToast("Couldn’t copy", { type: "error" }),
    )
  }

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:gap-[0.833vw]">
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
          <span className="font-medium text-foreground">
            {seats.used} of {seats.max}
          </span>{" "}
          seat{seats.max === 1 ? "" : "s"} used · {seats.planName} plan
        </p>
        {canManage && seatsLeft > 0 ? (
          <InviteDialog canInviteAdmin={viewerRole === "owner"} />
        ) : null}
      </div>

      {canManage && seatsLeft <= 0 ? (
        <p className="rounded-md lg:rounded-[0.556vw] border border-border bg-muted/40 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          You’ve used all {seats.max} seat{seats.max === 1 ? "" : "s"} on the{" "}
          {seats.planName} plan. Upgrade your plan to add teammates.
        </p>
      ) : null}

      {/* Members */}
      <div>
        <h3 className="mb-2 lg:mb-[0.556vw] text-sm lg:text-[0.972vw] font-semibold text-foreground">
          Members
        </h3>
        <ul className="divide-y divide-border rounded-md lg:rounded-[0.556vw] border border-border">
          {members.map((m) => {
            const isSelf = m.userId === viewerUserId
            const lastOwnerLock = m.role === "owner" && ownersCount <= 1
            // Owners manage everyone (minus last-owner lock); admins manage
            // members only.
            const manageable =
              canManage &&
              !isSelf &&
              !lastOwnerLock &&
              (viewerRole === "owner" || m.role === "member")
            // Only owners change roles; admins can just remove members.
            const canEditRole = manageable && viewerRole === "owner"

            return (
              <li
                key={m.userId}
                className="flex items-center gap-3 lg:gap-[0.833vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]"
              >
                <Avatar className="size-9 lg:size-[2.5vw]">
                  <AvatarFallback className="bg-muted text-xs lg:text-[0.833vw] font-medium text-foreground/70">
                    {initials(m.fullName || m.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
                    {m.fullName || m.email}
                    {isSelf ? (
                      <span className="ml-1.5 lg:ml-[0.417vw] text-xs lg:text-[0.833vw] font-normal text-muted-foreground">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[13px] lg:text-[0.903vw] text-muted-foreground">
                    {m.email}
                  </p>
                </div>

                {canEditRole ? (
                  <select
                    value={m.role}
                    disabled={pendingRow}
                    onChange={(e) => onRole(m.userId, e.target.value as MemberRole)}
                    className="h-9 lg:h-[2.5vw] rounded-md lg:rounded-[0.556vw] border border-input bg-card px-2 lg:px-[0.556vw] text-sm lg:text-[0.972vw] outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                ) : (
                  <RoleBadge role={m.role} />
                )}

                {manageable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingRow}
                    onClick={() => onRemove(m.userId, m.fullName || m.email)}
                  >
                    Remove
                  </Button>
                ) : null}

                {isSelf && !lastOwnerLock ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingRow}
                    onClick={onLeave}
                  >
                    Leave
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Pending invites */}
      {invitations.length > 0 && (
        <div>
          <h3 className="mb-2 lg:mb-[0.556vw] text-sm lg:text-[0.972vw] font-semibold text-foreground">
            Pending invites
          </h3>
          <ul className="divide-y divide-border rounded-md lg:rounded-[0.556vw] border border-border">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 lg:gap-[0.833vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
                    {inv.email}
                  </p>
                  <p className="text-[13px] lg:text-[0.903vw] text-muted-foreground">
                    Invited as {inv.role} ·{" "}
                    {inv.expired ? (
                      <span className="text-destructive">expired</span>
                    ) : (
                      "pending"
                    )}
                  </p>
                </div>
                {canManage ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingRow}
                      onClick={() => onResendInvite(inv.id)}
                    >
                      Resend
                    </Button>
                    {!inv.expired ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copy(`${window.location.origin}/invite/${inv.token}`)
                        }
                      >
                        Copy link
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingRow}
                      onClick={() => onCancelInvite(inv.id)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-medium capitalize",
        role === "owner"
          ? "bg-secondary text-secondary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {role}
    </span>
  )
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return "?"
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
