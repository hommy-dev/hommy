"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  signupContractor,
  startContractorGoogleSignup,
} from "@/lib/actions/auth"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type FieldErrors = Record<string, string>

export function ContractorSignupForm() {
  const router = useRouter()
  const [pending, startSubmit] = useTransition()
  const [googlePending, startGoogle] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showPw, setShowPw] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function handleGoogle() {
    startGoogle(async () => {
      const res = await startContractorGoogleSignup()
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      window.location.href = res.data!.url
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    const fd = new FormData(e.currentTarget)
    startSubmit(async () => {
      const res = await signupContractor(fd)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        if (res.fieldErrors) setErrors(res.fieldErrors)
        return
      }
      if (res.data?.needsConfirmation) {
        setSentTo(String(fd.get("email") ?? ""))
        return
      }
      router.push(res.data?.redirectTo ?? "/dashboard")
      router.refresh()
    })
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailIcon />
        </span>
        <h1 className="mt-5 font-sebenta text-2xl font-bold tracking-tight">
          Check your email
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-foreground/60">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Click it
          to finish setting up your roofer account.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-sebenta text-[1.9rem] font-bold leading-tight tracking-tight">
        Create your roofer account
      </h1>
      <p className="mt-2 text-[15px] text-foreground/60">
        Free to join. You only pay credits when you win a job.
      </p>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={googlePending || pending}
        className="mt-7 h-11 w-full gap-2.5 bg-card hover:bg-background hover:border-foreground/40 text-sm font-semibold"
      >
        <GoogleIcon />
        {googlePending ? "Opening Google..." : "Continue with Google"}
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-foreground/40">
        <span className="h-px flex-1 bg-foreground/10" />
        or
        <span className="h-px flex-1 bg-foreground/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field id="signup-fullName" label="Full name" error={errors.fullName}>
          <Input
            id="signup-fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Sam Rivera"
            disabled={pending}
            className="h-11 bg-card"
            aria-invalid={!!errors.fullName}
          />
        </Field>

        <Field id="signup-email" label="Work email" error={errors.email}>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={pending}
            className="h-11 bg-card"
            aria-invalid={!!errors.email}
          />
        </Field>

        <Field id="signup-password" label="Password" error={errors.password}>
          <div className="relative">
            <Input
              id="signup-password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              disabled={pending}
              className="h-11 bg-card pr-14"
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-3 my-auto h-fit text-xs font-medium text-foreground/50 hover:text-foreground"
              tabIndex={-1}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <div className="space-y-1.5 pt-1">
          <label
            htmlFor="signup-agree"
            className="flex items-start gap-2.5"
          >
            <Checkbox
              id="signup-agree"
              name="agree"
              aria-invalid={!!errors.agree}
              className="mt-0.5 bg-background border-foreground"
            />
            <span className="text-[13px] leading-relaxed text-foreground/60">
              I agree to the{" "}
              <Link
                href="#"
                className="text-foreground underline underline-offset-2"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="#"
                className="text-foreground underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.agree && (
            <p className="text-xs text-destructive">{errors.agree}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="mt-2 h-11 w-full text-sm font-semibold"
        >
          {pending ? "Creating your account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/55">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground/80">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
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

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
