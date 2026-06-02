"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { completeOnboarding } from "@/lib/actions/onboarding"
import { showToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

type Initial = {
  companyName: string
  phone: string
  yearsInBusiness: number | null
  subtypes: string[]
  zips: string[]
}

const STEP_TITLES = ["Your company", "What you do", "Where you work"]

export function OnboardingWizard({
  availableSubtypes,
  initial,
}: {
  availableSubtypes: string[]
  initial: Initial
}) {
  const router = useRouter()
  const [pending, startSave] = useTransition()
  const [step, setStep] = useState(0)

  const [companyName, setCompanyName] = useState(initial.companyName)
  const [phone, setPhone] = useState(initial.phone)
  const [years, setYears] = useState(
    initial.yearsInBusiness != null ? String(initial.yearsInBusiness) : "",
  )
  const [subtypes, setSubtypes] = useState<string[]>(initial.subtypes)
  const [zips, setZips] = useState<string[]>(initial.zips)
  const [zipInput, setZipInput] = useState("")

  function toggleSubtype(s: string) {
    setSubtypes((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    )
  }

  function addZip() {
    const z = zipInput.trim()
    if (!/^\d{5}$/.test(z)) return
    if (!zips.includes(z)) setZips((cur) => [...cur, z])
    setZipInput("")
  }

  const canAdvance =
    (step === 0 && companyName.trim().length >= 2) ||
    (step === 1 && subtypes.length >= 1) ||
    (step === 2 && zips.length >= 1)

  function next() {
    if (!canAdvance) return
    if (step < 2) {
      setStep((s) => s + 1)
      return
    }
    startSave(async () => {
      const res = await completeOnboarding({
        companyName: companyName.trim(),
        phone: phone.trim(),
        yearsInBusiness: years.trim() === "" ? null : Number(years),
        subtypes,
        zips,
      })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas text-foreground">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-5">
        <span className="font-sebenta text-lg font-bold">Homei</span>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          Skip for now
        </Link>
      </header>

      {/* progress */}
      <div className="mx-auto w-full max-w-2xl px-6">
        <div className="flex items-center justify-between text-xs font-medium text-foreground/50">
          <span>
            Step {step + 1} of 3 · {STEP_TITLES[step]}
          </span>
          <span>{Math.round(((step + 1) / 3) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
        {step === 0 && (
          <Step
            title="Tell us about your company"
            sub="The basics homeowners and our matching engine need."
          >
            <Field label="Company name">
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Lone Star Roofing Co."
                className={inputCls}
                autoFocus
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone (optional)">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="(214) 555-0100"
                  className={inputCls}
                />
              </Field>
              <Field label="Years in business (optional)">
                <input
                  value={years}
                  onChange={(e) => setYears(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  inputMode="numeric"
                  placeholder="12"
                  className={inputCls}
                />
              </Field>
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step
            title="What kind of roofing work do you do?"
            sub="Pick everything you handle. You can change this later."
          >
            <div className="flex flex-wrap gap-2.5">
              {availableSubtypes.map((s) => {
                const active = subtypes.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubtype(s)}
                    className={cn(
                      "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
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
            {subtypes.length === 0 && (
              <p className="mt-4 text-xs text-foreground/45">
                Select at least one to continue.
              </p>
            )}
          </Step>
        )}

        {step === 2 && (
          <Step
            title="Where do you work?"
            sub="Add the ZIP codes you cover. We only send you leads inside them."
          >
            <Field label="Add a ZIP code">
              <div className="flex gap-2">
                <input
                  value={zipInput}
                  onChange={(e) =>
                    setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addZip()
                    }
                  }}
                  inputMode="numeric"
                  placeholder="75201"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addZip}
                  disabled={!/^\d{5}$/.test(zipInput)}
                  className="shrink-0 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </Field>
            {zips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {zips.map((z) => (
                  <span
                    key={z}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                  >
                    {z}
                    <button
                      type="button"
                      onClick={() => setZips((cur) => cur.filter((x) => x !== z))}
                      aria-label={`Remove ${z}`}
                      className="text-secondary-foreground/60 hover:text-secondary-foreground"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Step>
        )}

        <div className="mt-auto flex items-center justify-between pt-10">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={cn(
              "text-sm font-medium text-foreground/55 transition-colors hover:text-foreground",
              step === 0 && "invisible",
            )}
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance || pending}
            className="rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
          >
            {step < 2 ? "Next" : pending ? "Saving..." : "Finish setup"}
          </button>
        </div>
      </main>
    </div>
  )
}

const inputCls =
  "w-full rounded-xl border border-foreground/15 bg-card px-3.5 py-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"

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
      <h1 className="font-sebenta text-[2rem] font-bold leading-tight tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-[15px] text-foreground/60">{sub}</p>
      <div className="mt-8 space-y-4">{children}</div>
    </div>
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
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground/75">{label}</label>
      {children}
    </div>
  )
}
