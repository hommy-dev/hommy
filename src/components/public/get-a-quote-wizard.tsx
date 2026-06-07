"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createLead } from "@/lib/actions/leads"
import {
  GooglePlacesInput,
  type PlaceResult,
} from "@/components/ui/google-places-input"
import { showToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const URGENCY = [
  { value: "emergency", label: "Emergency — need someone now" },
  { value: "within_week", label: "Within a week" },
  { value: "within_month", label: "Within a month" },
  { value: "planning", label: "Just planning / getting prices" },
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type StepKey = "what" | "where" | "you"
type FieldErrors = Record<string, string>

export function GetAQuoteWizard({
  subtypes,
  initialSubtype,
  initialWhere,
  isLoggedInHomeowner,
  loggedInName,
}: {
  subtypes: string[]
  initialSubtype: string
  initialWhere: string
  isLoggedInHomeowner: boolean
  loggedInName: string | null
}) {
  const router = useRouter()
  const [pending, startSubmit] = useTransition()

  // Guests fill all three steps; logged-in homeowners skip the contact step.
  const stepKeys: StepKey[] = isLoggedInHomeowner
    ? ["what", "where"]
    : ["what", "where", "you"]
  const total = stepKeys.length

  // A subtype carried from the homepage teaser lets us open straight at "where".
  const [stepIndex, setStepIndex] = useState(initialSubtype ? 1 : 0)
  const current = stepKeys[Math.min(stepIndex, total - 1)]

  const [subtype, setSubtype] = useState(initialSubtype)
  const [urgency, setUrgency] = useState<string>("within_month")
  const [notes, setNotes] = useState("")
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})

  const emailValid = EMAIL_RE.test(email.trim())
  const phoneValid = phone.replace(/\D/g, "").length >= 7

  const canAdvance =
    (current === "what" && subtype.length > 0) ||
    (current === "where" && place !== null) ||
    (current === "you" &&
      fullName.trim().length >= 2 &&
      emailValid &&
      phoneValid)

  function clearError(key: string) {
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e))
  }

  function stepOfField(field: string): number {
    if (field === "fullName" || field === "email" || field === "phone")
      return stepKeys.indexOf("you")
    if (field === "subtype" || field === "urgency" || field === "notes")
      return stepKeys.indexOf("what")
    return stepKeys.indexOf("where")
  }

  function submit() {
    startSubmit(async () => {
      const res = await createLead({
        subtype,
        urgency,
        notes: notes.trim(),
        address: place?.formattedAddress ?? "",
        city: place?.city ?? "",
        state: place?.state ?? "",
        zipCode: place?.zipCode ?? "",
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        ...(isLoggedInHomeowner ? {} : { fullName, email, phone }),
      })

      if (!res.success) {
        showToast(res.error, { type: "error" })
        if (res.fieldErrors) {
          setErrors(res.fieldErrors)
          const idxs = Object.keys(res.fieldErrors)
            .map(stepOfField)
            .filter((i) => i >= 0)
          if (idxs.length) setStepIndex(Math.min(...idxs))
        }
        return
      }
      router.push(res.data.redirectTo)
      router.refresh()
    })
  }

  function next() {
    if (!canAdvance || pending) return
    if (stepIndex < total - 1) {
      setStepIndex((s) => s + 1)
      return
    }
    submit()
  }

  const lastStep = stepIndex === total - 1

  return (
    <div className="flex min-h-svh flex-col bg-canvas text-foreground">
      <header className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] items-center justify-between px-6 lg:px-[1.667vw] py-5 lg:py-[1.389vw]">
        <Link href="/" className="font-sebenta text-lg lg:text-[1.25vw] font-bold">
          Homei
        </Link>
        <Link
          href="/"
          className="text-xs lg:text-[0.833vw] font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          Back to home
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl lg:max-w-[46.662vw] px-6 lg:px-[1.667vw]">
        <div className="flex items-center justify-between text-xs lg:text-[0.833vw] font-medium text-foreground/50">
          <span>
            Step {stepIndex + 1} of {total}
          </span>
          <span>{Math.round(((stepIndex + 1) / total) * 100)}%</span>
        </div>
        <div className="mt-2 lg:mt-[0.556vw] h-1.5 lg:h-[0.417vw] overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] flex-1 flex-col px-6 lg:px-[1.667vw] py-10 lg:py-[2.778vw]">
        {current === "what" && (
          <Step
            title="What's going on with your roof?"
            sub="Pick what's closest — you can add details in a moment."
          >
            <div className="flex flex-wrap gap-2.5 lg:gap-[0.694vw]">
              {subtypes.map((s) => {
                const active = subtype === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubtype(s)}
                    className={cn(
                      "rounded-full border px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] text-sm lg:text-[0.972vw] font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground/15 bg-card text-foreground/70 hover:border-foreground/30",
                    )}
                  >
                    {s}
                  </button>
                )
              })}
            </div>

            <Field label="How soon do you need it?">
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className={inputCls}
              >
                {URGENCY.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Anything else? (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                placeholder="e.g. leak over the garage after last week's storm"
                rows={3}
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </Step>
        )}

        {current === "where" && (
          <Step
            title="Where's the property?"
            sub="We match you with roofers who cover this address."
          >
            <Field label="Property address" error={errors.zipCode || errors.address}>
              <GooglePlacesInput
                mode="address"
                placeholder="Start typing your address…"
                value={place ? place.formattedAddress : initialWhere}
                onPlaceSelect={(p) => {
                  setPlace(p)
                  clearError("zipCode")
                  clearError("address")
                }}
                aria-invalid={!!(errors.zipCode || errors.address)}
              />
            </Field>
            {place && (
              <p className="text-[13px] lg:text-[0.903vw] text-foreground/55">
                {[place.city, place.state, place.zipCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {isLoggedInHomeowner && loggedInName && lastStep && (
              <p className="text-[13px] lg:text-[0.903vw] text-foreground/55">
                Posting as <span className="font-medium text-foreground">{loggedInName}</span>.
              </p>
            )}
          </Step>
        )}

        {current === "you" && (
          <Step
            title="Where should roofers reach you?"
            sub="We create your free account so you can compare quotes and message contractors."
          >
            <Field label="Full name" error={errors.fullName}>
              <input
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  clearError("fullName")
                }}
                placeholder="Jordan Smith"
                className={inputCls}
                autoFocus
              />
            </Field>
            <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
              <Field label="Email" error={errors.email}>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError("email")
                  }}
                  type="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    clearError("phone")
                  }}
                  type="tel"
                  inputMode="tel"
                  placeholder="(214) 555-0100"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="text-xs lg:text-[0.833vw] text-foreground/45">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>{" "}
              first to post under it.
            </p>
          </Step>
        )}

        <div className="mt-auto flex items-center justify-between pt-10 lg:pt-[2.778vw]">
          <button
            type="button"
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            className={cn(
              "text-sm lg:text-[0.972vw] font-medium text-foreground/55 transition-colors hover:text-foreground",
              stepIndex === 0 && "invisible",
            )}
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance || pending}
            className="rounded-xl lg:rounded-[0.926vw] bg-primary px-7 lg:px-[1.944vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] font-semibold text-primary-foreground transition-[transform,opacity] hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
          >
            {!lastStep ? "Next" : pending ? "Posting…" : "Post & see matches"}
          </button>
        </div>
      </main>
    </div>
  )
}

const inputCls =
  "w-full rounded-xl lg:rounded-[0.926vw] border border-foreground/15 bg-card px-3.5 lg:px-[0.972vw] py-3 lg:py-[0.833vw] text-[15px] lg:text-[1.042vw] text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"

function Step({
  title,
  sub,
  children,
}: {
  title: string
  sub: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="font-sebenta text-[2rem] lg:text-[2.222vw] font-bold leading-tight tracking-tight">
        {title}
      </h1>
      <p className="mt-2 lg:mt-[0.556vw] text-[15px] lg:text-[1.042vw] text-foreground/60">{sub}</p>
      <div className="mt-8 lg:mt-[2.222vw] space-y-5 lg:space-y-[1.389vw]">{children}</div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <label className="text-[13px] lg:text-[0.903vw] font-medium text-foreground/75">{label}</label>
      {children}
      {error ? <p className="text-[13px] lg:text-[0.903vw] text-destructive">{error}</p> : null}
    </div>
  )
}
