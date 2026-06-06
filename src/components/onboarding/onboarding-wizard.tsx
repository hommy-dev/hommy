"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { completeOnboarding } from "@/lib/actions/onboarding"
import { showToast } from "@/components/ui/toast"
import {
  GooglePlacesInput,
  type PlaceResult,
} from "@/components/ui/google-places-input"
import { cn } from "@/lib/utils"

type Area = { label: string; lat: number; lng: number; radiusMiles: number }

type Initial = {
  companyName: string
  phone: string
  yearsInBusiness: number | null
  subtypes: string[]
  areas: Area[]
}

const STEP_TITLES = ["Your company", "What you do", "Where you work"]
const RADIUS_OPTIONS = [10, 25, 50, 100] as const

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
  const [areas, setAreas] = useState<Area[]>(initial.areas)
  const [radius, setRadius] = useState<number>(25)
  const [pickerKey, setPickerKey] = useState(0) // bump to clear the address input

  function toggleSubtype(s: string) {
    setSubtypes((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    )
  }

  function addArea(place: PlaceResult) {
    const label =
      place.city && place.state
        ? `${place.city}, ${place.state}`
        : place.formattedAddress
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return
    setAreas((cur) => {
      if (cur.some((a) => a.label === label)) return cur
      return [...cur, { label, lat: place.lat, lng: place.lng, radiusMiles: radius }]
    })
    setPickerKey((k) => k + 1) // reset the autocomplete for the next area
  }

  function setAreaRadius(index: number, r: number) {
    setAreas((cur) => cur.map((a, i) => (i === index ? { ...a, radiusMiles: r } : a)))
  }

  const canAdvance =
    (step === 0 && companyName.trim().length >= 2) ||
    (step === 1 && subtypes.length >= 1) ||
    (step === 2 && areas.length >= 1)

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
        areas,
      })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      router.push("/contractor")
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas text-foreground">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-5">
        <span className="font-sebenta text-lg font-bold">Homei</span>
        <Link
          href="/contractor"
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
            sub="Add the areas you serve and how far you'll travel. We only send you leads inside them."
          >
            <Field label="Add an area you cover">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1">
                  <GooglePlacesInput
                    key={pickerKey}
                    mode="cities"
                    placeholder="Search a city or town…"
                    onPlaceSelect={addArea}
                  />
                </div>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className={cn(inputCls, "sm:w-40")}
                  aria-label="Coverage radius for the next area"
                >
                  {RADIUS_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      within {r} mi
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            {areas.length > 0 ? (
              <div className="mt-4 space-y-2">
                {areas.map((a, i) => (
                  <div
                    key={`${a.label}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-foreground/12 bg-card px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {a.label}
                    </span>
                    <select
                      value={a.radiusMiles}
                      onChange={(e) => setAreaRadius(i, Number(e.target.value))}
                      className="rounded-lg border border-foreground/15 bg-transparent px-2 py-1 text-xs font-medium text-foreground/70 outline-none"
                      aria-label={`Radius for ${a.label}`}
                    >
                      {RADIUS_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          within {r} mi
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setAreas((cur) => cur.filter((_, x) => x !== i))}
                      aria-label={`Remove ${a.label}`}
                      className="text-foreground/40 transition-colors hover:text-foreground"
                    >
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-foreground/45">
                Search a city above to add it. Pick a radius for how far you travel.
              </p>
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
