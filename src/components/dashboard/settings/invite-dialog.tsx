"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { inviteMember } from "@/lib/actions/team"
import { showToast } from "@/components/ui/toast"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { Field } from "./edit-dialog"

export function InviteDialog({ canInviteAdmin }: { canInviteAdmin: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [error, setError] = useState("")
  const [link, setLink] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function reset() {
    setEmail("")
    setRole("member")
    setError("")
    setLink(null)
  }

  function send() {
    setError("")
    setLink(null)
    start(async () => {
      const res = await inviteMember({ email: email.trim(), role })
      if (!res.success || !res.data) {
        setError(res.success ? "Could not send invite." : res.error)
        return
      }
      setLink(`${window.location.origin}/invite/${res.data.token}`)
      setEmail("")
      showToast("Invitation sent", { type: "success" })
      router.refresh()
    })
  }

  function copy(l: string) {
    navigator.clipboard?.writeText(l).then(
      () => showToast("Link copied", { type: "success" }),
      () => showToast("Couldn’t copy", { type: "error" }),
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 lg:gap-[0.417vw] font-semibold">
          <Icon name="add-user" className="size-4 lg:size-[1.111vw]" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md lg:max-w-[34vw]">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>They’ll join your company on Homei.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 lg:space-y-[1.111vw]">
          <Field label="Email" error={error}>
            <Input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              type="email"
              inputMode="email"
              placeholder="teammate@email.com"
              className="h-11 lg:h-[3.056vw]"
              aria-invalid={!!error}
            />
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="h-11 lg:h-[3.056vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.972vw] outline-none"
            >
              <option value="member">Member</option>
              {canInviteAdmin ? <option value="admin">Admin</option> : null}
            </select>
          </Field>

          {link ? (
            <div className="flex flex-wrap items-center justify-between gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] bg-muted/60 px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw]">
              <span className="min-w-0 truncate text-[13px] lg:text-[0.903vw] text-muted-foreground">
                {link}
              </span>
              <Button variant="outline" size="sm" onClick={() => copy(link)}>
                Copy link
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{link ? "Done" : "Cancel"}</Button>
          </DialogClose>
          {link ? null : (
            <Button
              onClick={send}
              disabled={pending || email.trim().length === 0}
              className="font-semibold"
            >
              {pending ? "Sending…" : "Send invite"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
