"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { submitSupportMessage } from "@/lib/actions/support"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field } from "@/components/dashboard/settings/edit-dialog"
import { SUPPORT_MESSAGE_TYPES, TYPE_LABEL, type SupportMessageType } from "@/lib/support/constants"

/**
 * Header entry to Hommy Support. Opens a small modal to pick a topic and write a
 * first message; on send it lazily creates the user's support thread and drops
 * them into the chat to continue. `basePath` is the role's messages base, e.g.
 * "/contractor/messages".
 */
export function SupportButton({ basePath }: { basePath: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<SupportMessageType>("problem")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({})
  const [pending, start] = useTransition()

  const isFeature = type === "feature_request"

  function reset() {
    setType("problem")
    setSubject("")
    setBody("")
    setErrors({})
  }

  function submit() {
    if (pending) return
    setErrors({})
    start(async () => {
      const res = await submitSupportMessage({
        type,
        subject: subject.trim() || undefined,
        body: body.trim(),
      })
      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors)
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Sent — we'll reply in your inbox.", { type: "success" })
      setOpen(false)
      reset()
      router.push(`${basePath}/${res.data.conversationId}`)
    })
  }

  const canSend = body.trim().length >= 1 && (!isFeature || subject.trim().length >= 3)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help and support"
        title="Help & support"
        className="grid size-9 lg:size-[2.5vw] place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon name="support" className="size-5 lg:size-[1.389vw]" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) reset()
        }}
      >
        <DialogContent className="sm:max-w-md lg:max-w-[34vw]">
          <DialogHeader>
            <DialogTitle>Help &amp; support</DialogTitle>
            <DialogDescription>
              Message the Hommy team. We&rsquo;ll reply right here in your inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 lg:space-y-[1.111vw]">
            <Field label="Topic">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {TYPE_LABEL[type]}
                    <Icon name="down" className="size-4 lg:size-[1.111vw] text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup
                    value={type}
                    onValueChange={(v) => setType(v as SupportMessageType)}
                  >
                    {SUPPORT_MESSAGE_TYPES.map((t) => (
                      <DropdownMenuRadioItem key={t.key} value={t.key}>
                        {TYPE_LABEL[t.key]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </Field>

            {isFeature ? (
              <Field label="What's the idea?" error={errors.subject}>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 140))}
                  placeholder="A short title, e.g. Bulk-message my leads"
                />
              </Field>
            ) : null}

            <Field label={isFeature ? "Tell us more" : "How can we help?"} error={errors.body}>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 4000))}
                rows={5}
                placeholder={
                  isFeature
                    ? "Describe what you'd like to be able to do…"
                    : "Describe what's going on, with any details that help…"
                }
                className="min-h-24 lg:min-h-[10vw]"
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSend || pending} className="font-semibold">
              {pending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
