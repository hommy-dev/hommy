"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import {
  acceptInvitation,
  signupAndAcceptInvitation,
} from "@/lib/actions/team"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InviteAccept({
  token,
  companyName,
  role,
  inviteEmail,
  loggedIn,
  viewerEmail,
  viewerIsContractor,
}: {
  token: string
  companyName: string
  role: string
  inviteEmail: string
  loggedIn: boolean
  viewerEmail: string | null
  viewerIsContractor: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)

  function done() {
    router.push("/contractor")
    router.refresh()
  }

  function accept() {
    setError("")
    start(async () => {
      const res = await acceptInvitation(token)
      if (!res.success) {
        setError(res.error)
        return
      }
      done()
    })
  }

  function signup() {
    setError("")
    start(async () => {
      const res = await signupAndAcceptInvitation({
        token,
        fullName: fullName.trim(),
        password,
      })
      if (!res.success) {
        setError(res.error)
        return
      }
      done()
    })
  }

  // --- Logged in -----------------------------------------------------------
  if (loggedIn) {
    if (!viewerIsContractor) {
      return (
        <Wrap companyName={companyName} role={role}>
          <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
            You’re signed in as{" "}
            <span className="font-medium text-foreground">{viewerEmail}</span>,
            which isn’t a contractor account. Sign in with a contractor account
            to join.
          </p>
          <Link
            href="/auth/login"
            className="mt-4 lg:mt-[1.111vw] inline-block text-sm lg:text-[0.972vw] font-semibold text-primary hover:underline"
          >
            Switch account
          </Link>
        </Wrap>
      )
    }

    const mismatch =
      !!viewerEmail && viewerEmail.toLowerCase() !== inviteEmail.toLowerCase()

    return (
      <Wrap companyName={companyName} role={role}>
        {mismatch ? (
          <p className="mb-4 lg:mb-[1.111vw] text-[13px] lg:text-[0.903vw] text-muted-foreground">
            Sent to {inviteEmail} — you’ll join as{" "}
            <span className="font-medium text-foreground">{viewerEmail}</span>.
          </p>
        ) : null}
        <Button
          onClick={accept}
          disabled={pending}
          size="lg"
          className="h-11 lg:h-[3.056vw] w-full font-semibold"
        >
          {pending ? "Joining…" : "Accept & join"}
        </Button>
        {error ? <ErrorLine>{error}</ErrorLine> : null}
      </Wrap>
    )
  }

  // --- Logged out: create account -----------------------------------------
  return (
    <Wrap companyName={companyName} role={role}>
      <div className="space-y-4 lg:space-y-[1.111vw] text-left">
        <Field label="Email">
          <Input
            value={inviteEmail}
            readOnly
            type="email"
            className="h-11 lg:h-[3.056vw] bg-muted/50 text-muted-foreground"
          />
        </Field>
        <Field label="Your name">
          <Input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              setError("")
            }}
            placeholder="Jordan Smith"
            className="h-11 lg:h-[3.056vw] bg-card"
            autoFocus
          />
        </Field>
        <Field label="Password">
          <div className="relative">
            <Input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11 lg:h-[3.056vw] bg-card pr-11 lg:pr-[3.056vw]"
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
        </Field>

        <Button
          onClick={signup}
          disabled={pending || fullName.trim().length < 2 || password.length < 8}
          size="lg"
          className="h-11 lg:h-[3.056vw] w-full font-semibold"
        >
          {pending ? "Joining…" : "Create account & join"}
        </Button>
        {error ? <ErrorLine>{error}</ErrorLine> : null}

        <p className="text-center text-xs lg:text-[0.833vw] text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={`/auth/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Wrap>
  )
}

function Wrap({
  companyName,
  role,
  children,
}: {
  companyName: string
  role: string
  children: React.ReactNode
}) {
  return (
    <>
      <h1 className="mt-6 lg:mt-[1.667vw] font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
        Join {companyName}
      </h1>
      <p className="mt-2 lg:mt-[0.556vw] mb-6 lg:mb-[1.667vw] text-sm lg:text-[0.972vw] text-muted-foreground">
        You’ve been invited as{" "}
        <span className="font-medium text-foreground">{role}</span>.
      </p>
      {children}
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
        {label}
      </Label>
      {children}
    </div>
  )
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm lg:text-[0.972vw] text-destructive">{children}</p>
  )
}
