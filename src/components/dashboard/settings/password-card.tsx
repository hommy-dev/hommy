"use client"

import { useState, useTransition } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { setPassword } from "@/lib/actions/account"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const [pw, setPw] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function save() {
    setError("")
    start(async () => {
      const res = await setPassword({ password: pw })
      if (!res.success) {
        setError(res.error)
        return
      }
      setPw("")
      showToast(hasPassword ? "Password updated" : "Password set", {
        type: "success",
      })
    })
  }

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="space-y-1.5 lg:space-y-[0.417vw]">
        <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
          {hasPassword ? "New password" : "Password"}
        </Label>
        <div className="relative max-w-md lg:max-w-[28vw]">
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
            <HugeiconsIcon
              icon={show ? ViewOffSlashIcon : ViewIcon}
              strokeWidth={2}
              className="size-4 lg:size-[1.111vw]"
            />
          </button>
        </div>
        {error ? (
          <p className="text-xs lg:text-[0.833vw] text-destructive">{error}</p>
        ) : null}
      </div>

      <Button
        onClick={save}
        disabled={pending || pw.length < 8}
        size="lg"
        className="font-semibold"
      >
        {pending ? "Saving…" : hasPassword ? "Update password" : "Set password"}
      </Button>
    </div>
  )
}
