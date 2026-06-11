"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateServiceSubtypes } from "@/lib/actions/contractor-coverage"
import { showToast } from "@/components/ui/toast"
import { OptionCard } from "@/components/ui/option-card"
import { SUBTYPE_META } from "@/components/public/get-a-quote/constants"
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
      wide
    >
      <div className="grid gap-2.5 lg:gap-[0.694vw] sm:grid-cols-2">
        {available.map((s) => (
          <OptionCard
            key={s}
            label={s}
            icon={SUBTYPE_META[s]?.icon}
            desc={SUBTYPE_META[s]?.desc}
            active={selected.includes(s)}
            onClick={() => toggle(s)}
          />
        ))}
      </div>
      {selected.length === 0 ? (
        <p className="text-xs lg:text-[0.833vw] text-destructive">
          Pick at least one type of work.
        </p>
      ) : null}
    </EditDialog>
  )
}
