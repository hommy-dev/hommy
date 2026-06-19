"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { setPassword } from "@/lib/actions/account"
import { showToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { EditDialog, Field } from "./edit-dialog"

export function ChangePasswordDialog({ hasPassword }: { hasPassword: boolean }) {
  const [pw, setPw] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    setPw("")
    setShow(false)
    setError("")
  }

  async function save(): Promise<boolean> {
    setError("")
    const res = await setPassword({ password: pw })
    if (!res.success) {
      setError(res.error)
      return false
    }
    showToast(hasPassword ? "Password updated" : "Password set", { type: "success" })
    return true
  }

  return (
    <EditDialog
      title={hasPassword ? "Change password" : "Set a password"}
      description={
        hasPassword
          ? undefined
          : "Set a password so you can sign in with your email."
      }
      triggerLabel={hasPassword ? "Change" : "Set password"}
      triggerIcon="lock"
      onOpen={reset}
      onSave={save}
      canSave={pw.length >= 8}
      saveLabel={hasPassword ? "Update password" : "Set password"}
    >
      <Field label={hasPassword ? "New password" : "Password"} error={error}>
        <div className="relative">
          <Input
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setError("")
            }}
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="h-11 lg:h-[3.056vw] pr-11 lg:pr-[3.056vw]"
            aria-invalid={!!error}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 lg:w-[3.056vw] items-center justify-center text-foreground/50 hover:text-foreground"
            tabIndex={-1}
          >
            <Icon
              name={show ? "hide" : "show"}
              className="size-4 lg:size-[1.111vw]"
            />
          </button>
        </div>
      </Field>
    </EditDialog>
  )
}
