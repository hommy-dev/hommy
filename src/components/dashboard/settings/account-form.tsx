"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateMyAccount } from "@/lib/actions/account"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AccountForm({
  initial,
}: {
  initial: { fullName: string; email: string; phone: string }
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initial.fullName)
  const [phone, setPhone] = useState(initial.phone)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const dirty =
    fullName.trim() !== initial.fullName.trim() ||
    phone.trim() !== initial.phone.trim()

  function save() {
    setErrors({})
    start(async () => {
      const res = await updateMyAccount({
        fullName: fullName.trim(),
        phone: phone.trim(),
      })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        if (res.fieldErrors) setErrors(res.fieldErrors)
        return
      }
      showToast("Changes saved", { type: "success" })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5 lg:space-y-[1.389vw]">
      <Field label="Full name" error={errors.fullName}>
        <Input
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value)
            setErrors((p) => ({ ...p, fullName: "" }))
          }}
          placeholder="Jordan Smith"
          className="h-11 lg:h-[3.056vw] max-w-md lg:max-w-[28vw]"
          aria-invalid={!!errors.fullName}
        />
      </Field>

      <Field label="Email" hint="Contact support to change your email.">
        <Input
          value={initial.email}
          readOnly
          type="email"
          className="h-11 lg:h-[3.056vw] max-w-md lg:max-w-[28vw] bg-muted/50 text-muted-foreground"
        />
      </Field>

      <Field label="Phone" error={errors.phone}>
        <Input
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setErrors((p) => ({ ...p, phone: "" }))
          }}
          type="tel"
          inputMode="tel"
          placeholder="(214) 555-0100"
          className="h-11 lg:h-[3.056vw] max-w-md lg:max-w-[28vw]"
          aria-invalid={!!errors.phone}
        />
      </Field>

      <div className="flex justify-end pt-1 lg:pt-[0.278vw]">
        <Button
          onClick={save}
          disabled={!dirty || pending}
          size="lg"
          className="font-semibold"
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
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
