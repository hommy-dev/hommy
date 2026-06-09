"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { loginHomeownerInline } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { WizardField } from "./wizard-parts"

export type HomeownerContact = {
  fullName: string
  email: string
  phone: string
}

// Inline sign-in popup for returning homeowners. Authenticates without leaving
// the wizard (password) and hands the contact details back so the form can
// auto-fill. Google leaves to OAuth — the parent persists the in-progress job
// via onBeforeGoogle so it survives the round-trip.
export function LoginDialog({
  open,
  onOpenChange,
  email,
  onSuccess,
  onGoogle,
  googlePending = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  onSuccess: (contact: HomeownerContact) => void
  onGoogle?: () => void
  googlePending?: boolean
}) {
  const [emailValue, setEmailValue] = useState(email)
  const [prevEmail, setPrevEmail] = useState(email)
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  // Keep the field in sync if the wizard's email changes before opening.
  if (email !== prevEmail) {
    setPrevEmail(email)
    setEmailValue(email)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData()
    fd.set("email", emailValue.trim().toLowerCase())
    fd.set("password", password)
    start(async () => {
      const res = await loginHomeownerInline(fd)
      if (!res.success || !res.data) {
        setError(res.success ? "Could not sign in. Please try again." : res.error)
        return
      }
      setPassword("")
      onSuccess(res.data)
    })
  }

  const busy = pending || googlePending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md lg:max-w-[35vw]">
        <DialogHeader className="">
          <DialogTitle className="">
            Welcome back
          </DialogTitle>
          <DialogDescription className="">
            Sign in to post this job under your account.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 lg:space-y-[1.389vw] mt-1 lg:mt-[0.5vw]"
          noValidate
        >
          <WizardField label="Email">
            <Input
              value={emailValue}
              onChange={(e) => {
                setEmailValue(e.target.value)
                setError("")
              }}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              className="h-11 lg:h-[3.056vw] bg-card text-left"
            />
          </WizardField>

          <WizardField label="Password" error={error || undefined}>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                className="h-11 lg:h-[3.056vw] bg-card pr-11 lg:pr-[3.056vw] text-left"
                aria-invalid={!!error}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-11 lg:w-[3.056vw] items-center justify-center text-foreground/50 hover:text-foreground"
                tabIndex={-1}
              >
                <HugeiconsIcon
                  icon={showPw ? ViewOffSlashIcon : ViewIcon}
                  strokeWidth={2}
                  className="size-4 lg:size-[1.111vw]"
                />
              </button>
            </div>
          </WizardField>

          <Button
            type="submit"
            size="lg"
            disabled={busy || password.length < 1}
            className="w-full font-semibold"
          >
            {pending ? "Signing in…" : "Log in"}
          </Button>
        </form>

        {onGoogle && (
          <>
            <div className="flex items-center gap-3 lg:gap-[0.833vw] text-xs lg:text-[0.833vw] text-foreground/40">
              <span className="h-px flex-1 bg-border" />
              OR
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onGoogle}
              disabled={busy}
              className="h-11 lg:h-[3.056vw] w-full gap-2.5 lg:gap-[0.694vw] bg-card font-semibold hover:bg-background hover:border-foreground/40"
            >
              <GoogleIcon />
              {googlePending ? "Opening Google…" : "Continue with Google"}
            </Button>
          </>
        )}

        <p className="text-center text-xs lg:text-[0.833vw] text-foreground/50">
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}
