"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { CoverageAreasForm } from "./coverage-areas-form"
import type { ServiceAreaRow } from "@/lib/actions/contractor-coverage"

// Coverage areas add/remove happen live (each is its own server action), so this
// isn't a save-on-close form — it's a management surface. We refresh the read
// view when it closes.
export function ManageAreasDialog({
  initialAreas,
}: {
  initialAreas: ServiceAreaRow[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) router.refresh()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 lg:gap-[0.417vw]">
          <Icon name="edit" className="size-4 lg:size-[1.111vw]" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg lg:max-w-[42vw]">
        <DialogHeader>
          <DialogTitle>Coverage areas</DialogTitle>
        </DialogHeader>
        <CoverageAreasForm initialAreas={initialAreas} canManage />
        <DialogFooter>
          <DialogClose asChild>
            <Button className="font-semibold">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
