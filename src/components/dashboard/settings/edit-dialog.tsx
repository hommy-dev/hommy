"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
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
import { Icon, type IconName } from "@/components/ui/icon"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// A read-section's "Edit" affordance: a trigger button that opens a modal with
// the form, plus Cancel / Save. `onOpen` re-seeds the parent's fields each time
// it opens (so a cancelled edit doesn't leak into the next one). `onSave`
// returns true to close, false to stay open (validation/error).
export function EditDialog({
  title,
  description,
  children,
  onSave,
  onOpen,
  triggerLabel = "Edit",
  triggerIcon = "edit",
  iconOnly = false,
  saveLabel = "Save changes",
  canSave = true,
  wide = false,
}: {
  title: string
  description?: string
  children: ReactNode
  onSave: () => Promise<boolean>
  onOpen?: () => void
  triggerLabel?: string
  triggerIcon?: IconName
  iconOnly?: boolean
  saveLabel?: string
  canSave?: boolean
  wide?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function save() {
    if (!canSave || pending) return
    start(async () => {
      const ok = await onSave()
      if (ok) setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) onOpen?.()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={iconOnly ? "icon-sm" : "sm"}
          aria-label={iconOnly ? triggerLabel : undefined}
          className={cn(!iconOnly && "gap-1.5 lg:gap-[0.417vw]")}
        >
          <Icon name={triggerIcon} className="size-4 lg:size-[1.111vw]" />
          {iconOnly ? null : triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent
        className={wide ? "sm:max-w-lg lg:max-w-[42vw] max-h-[95vh] overflow-y-auto" : "sm:max-w-md lg:max-w-[34vw]  max-h-[95vh] overflow-y-auto"}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-4 lg:space-y-[1.111vw]">{children}</div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={save} disabled={!canSave || pending} className="font-semibold">
            {pending ? "Saving…" : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// A labelled read-only field for settings. Stacks on mobile, label-left /
// value-right on desktop. Pass a string or rich node as the value.
export function DataRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 lg:gap-[0.278vw] py-3.5 lg:py-[0.972vw] first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6 lg:sm:gap-[1.667vw]">
      <dt className="shrink-0 text-sm lg:text-[0.972vw] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm lg:text-[0.972vw] font-medium text-foreground sm:text-right">
        {children}
      </dd>
    </div>
  )
}

// Muted placeholder for an unset value.
export function Empty({ children = "Not set" }: { children?: ReactNode }) {
  return <span className="font-normal text-muted-foreground">{children}</span>
}

// Labelled form field for use inside an EditDialog.
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
        {label}
      </Label>
      {children}
      {hint && !error ? (
        <p className="text-xs lg:text-[0.833vw] text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs lg:text-[0.833vw] text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
