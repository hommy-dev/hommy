"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateMyAccount } from "@/lib/actions/account"
import { showToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/reui/phone-input"
import { EditDialog, Field } from "./edit-dialog"

export function EditAccountDialog({
  initial,
}: {
  initial: { fullName: string; email: string; phone: string }
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initial.fullName)
  const [phone, setPhone] = useState(initial.phone)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function reset() {
    setFullName(initial.fullName)
    setPhone(initial.phone)
    setErrors({})
  }

  async function save(): Promise<boolean> {
    setErrors({})
    const res = await updateMyAccount({ fullName: fullName.trim(), phone: phone.trim() })
    if (!res.success) {
      showToast(res.error, { type: "error" })
      if (res.fieldErrors) setErrors(res.fieldErrors)
      return false
    }
    showToast("Changes saved", { type: "success" })
    router.refresh()
    return true
  }

  return (
    <EditDialog
      title="Edit your details"
      onOpen={reset}
      onSave={save}
      canSave={fullName.trim().length >= 2}
    >
      <Field label="Full name" error={errors.fullName}>
        <Input
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value)
            setErrors((p) => ({ ...p, fullName: "" }))
          }}
          placeholder="Jordan Smith"
          className="h-11 lg:h-[3.056vw]"
          aria-invalid={!!errors.fullName}
        />
      </Field>
      <Field label="Email" hint="Contact support to change your email.">
        <Input
          value={initial.email}
          readOnly
          type="email"
          className="h-11 lg:h-[3.056vw] bg-muted/50 text-muted-foreground"
        />
      </Field>
      <Field label="Phone" error={errors.phone}>
        <PhoneInput
          value={phone}
          onChange={(v) => {
            setPhone(v ?? "")
            setErrors((p) => ({ ...p, phone: "" }))
          }}
          defaultCountry="US"
          placeholder="(214) 555-0100"
        />
      </Field>
    </EditDialog>
  )
}
