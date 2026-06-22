"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button, buttonVariants } from "@/components/ui/button"
import { showToast } from "@/components/ui/toast"
import { joinWaitlist, continueAsLocal } from "@/lib/actions/waitlist"
import { OPERATING_AREAS_LABEL } from "@/lib/config/service-areas"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ComingSoon({ regionLabel }: { regionLabel: string | null }) {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [pending, startSubmit] = useTransition()

  const place = regionLabel ?? "your area"

  function submit() {
    const next: Record<string, string> = {}
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email"
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    startSubmit(async () => {
      const res = await joinWaitlist({ email, fullName, zipCode })
      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors)
        showToast(res.error, { type: "error" })
        return
      }
      setDone(true)
      showToast("You're on the list.", {
        type: "success",
        description: "We'll be in touch the moment we reach you.",
      })
    })
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas text-foreground">
      <header className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] items-center justify-center px-6 lg:px-[1.667vw] py-6 lg:py-[1.667vw]">
        <Link href="/" aria-label="Hommy home">
          <Icon name="logo" className="size-9 lg:size-[2.5vw]" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] flex-1 flex-col justify-center px-6 lg:px-[1.667vw] pb-16 lg:pb-[4.444vw]">
        <div className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-background p-7 lg:p-[2.222vw] text-center shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          {done ? (
            <SuccessState email={email.trim()} fullName={fullName.trim()} place={place} />
          ) : (
            <>
              <span className="mx-auto flex size-12 lg:size-[3.333vw] items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="location" className="size-6 lg:size-[1.667vw]" />
              </span>

              <h1 className="mt-5 lg:mt-[1.389vw] font-sebenta text-[2rem] lg:text-[2.222vw] font-bold leading-tight tracking-tight">
                We&apos;re not in {place} just yet
              </h1>
              <p className="mx-auto mt-2 lg:mt-[0.556vw] max-w-md lg:max-w-[26vw] text-[15px] lg:text-[1.042vw] text-foreground/60">
                Hommy is live in {OPERATING_AREAS_LABEL} and growing fast. Leave your
                details and we&apos;ll let you know the moment we reach you.
              </p>

              <div className="mt-7 lg:mt-[1.944vw] space-y-4 lg:space-y-[1.111vw] text-left">
                <Field label="Email" htmlFor="wl-email" error={errors.email}>
                  <Input
                    id="wl-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    aria-invalid={!!errors.email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((p) => ({ ...p, email: "" }))
                    }}
                    className="h-11 lg:h-[3.056vw] bg-card"
                  />
                </Field>

                <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
                  <Field label="Name" hint="Optional" htmlFor="wl-name">
                    <Input
                      id="wl-name"
                      autoComplete="name"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 lg:h-[3.056vw] bg-card"
                    />
                  </Field>
                  <Field label="ZIP code" hint="Optional" htmlFor="wl-zip">
                    <Input
                      id="wl-zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="e.g. 73301"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="h-11 lg:h-[3.056vw] bg-card"
                    />
                  </Field>
                </div>

                <Button
                  type="button"
                  size="lg"
                  onClick={submit}
                  disabled={pending}
                  className="w-full font-semibold"
                >
                  {pending ? "Joining…" : "Join the waitlist"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Contractor path — companies can join from anywhere. */}
        <div className="mt-4 lg:mt-[1.111vw] rounded-2xl lg:rounded-[1.111vw] border border-border bg-background p-5 lg:p-[1.389vw]">
          <div className="flex flex-wrap items-center justify-between gap-3 lg:gap-[0.833vw]">
            <div className="flex items-start gap-3 lg:gap-[0.833vw] text-left">
              <span className="mt-0.5 lg:mt-[0.139vw] flex size-9 lg:size-[2.5vw] shrink-0 items-center justify-center rounded-lg lg:rounded-[0.694vw] bg-accent text-foreground/70">
                <Icon name="work" className="size-5 lg:size-[1.389vw]" />
              </span>
              <div>
                <p className="text-sm lg:text-[0.972vw] font-semibold">
                  Are you a roofing company?
                </p>
                <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.903vw] text-foreground/60">
                  Companies can join Hommy from anywhere.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "surface" }), "shrink-0 font-semibold")}
            >
              Continue to Hommy
              <Icon name="arrow-right" className="size-4 lg:size-[1.111vw]" />
            </Link>
          </div>
        </div>

        {/* Safety valve — a real customer with a wrong/VPN location can self-attest. */}
        {!done ? (
          <form action={continueAsLocal} className="mt-5 lg:mt-[1.389vw] text-center">
            <button
              type="submit"
              className="text-xs lg:text-[0.833vw] underline-offset-4 transition-colors text-muted-foreground hover:underline"
            >
              Already in {OPERATING_AREAS_LABEL}? Continue to get your quotes.
            </button>
          </form>
        ) : null}
      </main>
    </div>
  )
}

function SuccessState({
  email,
  fullName,
  place,
}: {
  email: string
  fullName: string
  place: string
}) {
  const name = fullName ? `, ${fullName.split(" ")[0]}` : ""
  return (
    <div>
      <span className="mx-auto flex size-12 lg:size-[3.333vw] items-center justify-center rounded-full bg-success/10 text-success">
        <Icon name="tick-square" className="size-6 lg:size-[1.667vw]" />
      </span>
      <h1 className="mt-5 lg:mt-[1.389vw] font-sebenta text-[2rem] lg:text-[2.222vw] font-bold leading-tight tracking-tight">
        You&apos;re on the list
      </h1>
      <p className="mx-auto mt-2 lg:mt-[0.556vw] max-w-md lg:max-w-[26vw] text-[15px] lg:text-[1.042vw] text-foreground/60">
        Thanks{name}. We&apos;ll email {email} the moment Hommy is live in {place}.
      </p>
    </div>
  )
}

function Field({
  label,
  hint,
  htmlFor,
  error,
  children,
}: {
  label: string
  hint?: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-foreground/80">
          {label}
        </Label>
        {hint ? (
          <span className="text-xs lg:text-[0.764vw] text-foreground/40">{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs lg:text-[0.833vw] text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
