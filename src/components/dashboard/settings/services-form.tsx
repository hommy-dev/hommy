"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateServiceSubtypes } from "@/lib/actions/contractor-coverage"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"

export function ServicesForm({
  available,
  initial,
  canManage,
}: {
  available: string[]
  initial: string[]
  canManage: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(initial)
  const [pending, start] = useTransition()

  const dirty =
    selected.length !== initial.length ||
    selected.some((s) => !initial.includes(s))

  function toggle(s: string) {
    setSelected((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  }

  function save() {
    start(async () => {
      const res = await updateServiceSubtypes({ subtypes: selected })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Services saved", { type: "success" })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex flex-wrap gap-2 lg:gap-[0.556vw]">
        {available.map((s) => {
          const active = selected.includes(s)
          return (
            <Button
              key={s}
              type="button"
              variant={active ? "default" : "outline"}
              disabled={!canManage}
              onClick={() => toggle(s)}
            >
              {s}
            </Button>
          )
        })}
      </div>

      {canManage ? (
        <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
          {selected.length === 0 ? (
            <p className="text-xs lg:text-[0.833vw] text-destructive">
              Pick at least one type of work.
            </p>
          ) : (
            <span />
          )}
          <Button
            onClick={save}
            disabled={!dirty || selected.length === 0 || pending}
            size="lg"
            className="font-semibold"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : (
        <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
          Only owners and admins can change services.
        </p>
      )}
    </div>
  )
}
