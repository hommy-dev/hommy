"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateServiceSubtypes } from "@/lib/actions/contractor-coverage"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { EditDialog } from "./edit-dialog"

export function EditServicesDialog({
  available,
  initial,
}: {
  available: string[]
  initial: string[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(initial)

  function reset() {
    setSelected(initial)
  }
  function toggle(s: string) {
    setSelected((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  }

  async function save(): Promise<boolean> {
    const res = await updateServiceSubtypes({ subtypes: selected })
    if (!res.success) {
      showToast(res.error, { type: "error" })
      return false
    }
    showToast("Services saved", { type: "success" })
    router.refresh()
    return true
  }

  return (
    <EditDialog
      title="Services you offer"
      description="The types of roofing work you take on."
      onOpen={reset}
      onSave={save}
      canSave={selected.length > 0}
    >
      <div className="flex flex-wrap gap-2 lg:gap-[0.556vw]">
        {available.map((s) => {
          const active = selected.includes(s)
          return (
            <Button
              key={s}
              type="button"
              variant={active ? "default" : "outline"}
              onClick={() => toggle(s)}
            >
              {s}
            </Button>
          )
        })}
      </div>
      {selected.length === 0 ? (
        <p className="text-xs lg:text-[0.833vw] text-destructive">
          Pick at least one type of work.
        </p>
      ) : null}
    </EditDialog>
  )
}
