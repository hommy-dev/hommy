"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  signupHomeowner,
  startHomeownerGoogleSignup,
} from "@/lib/actions/auth"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Icon } from "@/components/ui/icon"

type FieldErrors = Record<string, string>

export function HomeownerSignupForm() {
  const router = useRouter()
  const [pending, startSubmit] = useTransition()
  const [googlePending, startGoogle] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showPw, setShowPw] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function handleGoogle() {
    startGoogle(async () => {
      const res = await startHomeownerGoogleSignup()
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
      const res = await signupHomeowner(fd)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        if (res.fieldErrors) setErrors(res.fieldErrors)
        return
      }
      if (res.data?.needsConfirmation) {
        setSentTo(String(fd.get("email") ?? ""))
        return
      }
      router.push(res.data?.redirectTo ?? "/homeowner")
      router.refresh()
    })
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-12 lg:size-[3.333vw] items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailIcon />
        </span>
        <h1 className="mt-5 lg:mt-[1.389vw] font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Check your email
        </h1>
        <p className="mx-auto mt-2 lg:mt-[0.556vw] max-w-sm lg:max-w-[26.664vw] text-[15px] lg:text-[1.042vw] leading-relaxed text-foreground/60">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Click it
          to finish setting up your account.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 lg:mt-[1.667vw] inline-block text-sm lg:text-[0.972vw] font-semibold text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-sebenta text-[1.9rem] lg:text-[2.111vw] font-bold leading-tight tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 lg:mt-[0.3vw] text-[15px] lg:text-[1.042vw] text-foreground/60">
        Get matched with vetted local roofers. Free, with no obligation.
      </p>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={googlePending || pending}
         className="mt-7 lg:mt-[1.944vw] h-11 lg:h-[3.056vw] w-full gap-2.5 lg:gap-[0.694vw] bg-card hover:bg-background hover:border-foreground/40 text-sm lg:text-[0.972vw] font-semibold"
      >
        <Icon name="google" preserveColors className="size-[18px] lg:size-[1.25vw]" />
        {googlePending ? "Opening Google..." : "Continue with Google"}
      </Button>

      <div className="my-6 lg:my-[1.667vw] flex items-center gap-3 lg:gap-[0.833vw] text-xs lg:text-[0.833vw] text-foreground/40">
        <span className="h-px lg:h-[0.069vw] flex-1 bg-foreground/10" />
        or
        <span className="h-px lg:h-[0.069vw] flex-1 bg-foreground/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-[1.111vw]" noValidate>
        <Field id="homeowner-fullName" label="Full name" error={errors.fullName}>
          <Input
            id="homeowner-fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Sam Rivera"
            disabled={pending}
            className="h-11 lg:h-[3.056vw] bg-card"
            aria-invalid={!!errors.fullName}
          />
        </Field>

        <Field id="homeowner-email" label="Email" error={errors.email}>
          <Input
            id="homeowner-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={pending}
            className="h-11 lg:h-[3.056vw] bg-card"
            aria-invalid={!!errors.email}
          />
        </Field>

        <Field id="homeowner-password" label="Password" error={errors.password}>
          <div className="relative">
            <Input
              id="homeowner-password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              disabled={pending}
              className="h-11 lg:h-[3.056vw] bg-card pr-14 lg:pr-[3.889vw]"
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 lg:right-[0.833vw] my-auto flex h-fit items-center text-foreground/45 transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              <Icon name={showPw ? "hide" : "show"} className="size-5 lg:size-[1.25vw]" />
            </button>
          </div>
        </Field>

        <div className="space-y-1.5 lg:space-y-[0.417vw] pt-1 lg:pt-[0.278vw]">
          <label htmlFor="homeowner-agree" className="flex items-start gap-2.5 lg:gap-[0.694vw]">
            <Checkbox
              id="homeowner-agree"
              name="agree"
              aria-invalid={!!errors.agree}
              className="mt-0.5 lg:mt-[0.139vw] bg-background border-foreground"
            />
            <span className="text-[13px] lg:text-[0.903vw] leading-relaxed text-foreground/60">
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
            <p className="text-xs lg:text-[0.833vw] text-destructive">{errors.agree}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="mt-2 lg:mt-[0.556vw] h-11 lg:h-[3.056vw] w-full text-sm lg:text-[0.972vw] font-semibold"
        >
          {pending ? "Creating your account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 lg:mt-[1.667vw] text-center text-sm lg:text-[0.972vw] text-foreground/55">
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
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <Label htmlFor={id} className="text-xs lg:text-[0.833vw] font-medium text-foreground/80">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs lg:text-[0.833vw] text-destructive">{error}</p>}
    </div>
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
