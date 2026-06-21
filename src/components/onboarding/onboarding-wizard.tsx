"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { completeOnboarding } from "@/lib/actions/onboarding"
import { showToast } from "@/components/ui/toast"
import { PhoneInput } from "@/components/reui/phone-input"
import {
  GooglePlacesInput,
  type PlaceResult,
} from "@/components/ui/google-places-input"
import { cn } from "@/lib/utils"

type Area = { label: string; lat: number; lng: number; radiusKm: number }

type Initial = {
  companyName: string
  phone: string
  yearsInBusiness: number | null
  subtypes: string[]
  areas: Area[]
}

const STEP_TITLES = ["Your company", "What you do", "Where you work"]
const DEFAULT_RADIUS_KM = 40

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
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_KM)
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
      return [...cur, { label, lat: place.lat, lng: place.lng, radiusKm: radius }]
    })
    setPickerKey((k) => k + 1) // reset the autocomplete for the next area
  }

  function setAreaRadius(index: number, r: number) {
    if (!Number.isFinite(r) || r < 1) return
    setAreas((cur) => cur.map((a, i) => (i === index ? { ...a, radiusKm: r } : a)))
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
      <header className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] items-center justify-between px-6 lg:px-[1.667vw] py-5 lg:py-[1.389vw]">
        <span className="font-sebenta text-lg lg:text-[1.25vw] font-bold">Homei</span>
        <Link
          href="/contractor"
          className="text-xs lg:text-[0.833vw] font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          Skip for now
        </Link>
      </header>

      {/* progress */}
      <div className="mx-auto w-full max-w-2xl lg:max-w-[46.662vw] px-6 lg:px-[1.667vw]">
        <div className="flex items-center justify-between text-xs lg:text-[0.833vw] font-medium text-foreground/50">
          <span>
            Step {step + 1} of 3 · {STEP_TITLES[step]}
          </span>
          <span>{Math.round(((step + 1) / 3) * 100)}%</span>
        </div>
        <div className="mt-2 lg:mt-[0.556vw] h-1.5 lg:h-[0.417vw] overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-2xl lg:max-w-[46.662vw] flex-1 flex-col px-6 lg:px-[1.667vw] py-10 lg:py-[2.778vw]">
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
            <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
              <Field label="Phone (optional)">
                <PhoneInput
                  value={phone}
                  onChange={(v) => setPhone(v ?? "")}
                  defaultCountry="US"
                  placeholder="(214) 555-0100"
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
            <div className="flex flex-wrap gap-2.5 lg:gap-[0.694vw]">
              {availableSubtypes.map((s) => {
                const active = subtypes.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubtype(s)}
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
            {subtypes.length === 0 && (
              <p className="mt-4 lg:mt-[1.111vw] text-xs lg:text-[0.833vw] text-foreground/45">
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
              <div className="flex flex-col gap-2 lg:gap-[0.556vw] sm:flex-row">
                <div className="min-w-0 flex-1">
                  <GooglePlacesInput
                    key={pickerKey}
                    mode="address"
                    placeholder="Search a city, area, or place…"
                    onPlaceSelect={addArea}
                  />
                </div>
                <div className="relative sm:w-40">
                  <input
                    type="number"
                    min={1}
                    max={800}
                    step="any"
                    value={Number.isFinite(radius) ? radius : ""}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className={cn(inputCls, "pr-12 lg:pr-[3.333vw]")}
                    aria-label="Coverage radius in kilometres for the next area"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 lg:right-[0.833vw] flex items-center text-sm lg:text-[0.972vw] text-foreground/45">
                    km
                  </span>
                </div>
              </div>
            </Field>

            {areas.length > 0 ? (
              <div className="mt-4 lg:mt-[1.111vw] space-y-2 lg:space-y-[0.556vw]">
                {areas.map((a, i) => (
                  <div
                    key={`${a.label}-${i}`}
                    className="flex items-center gap-3 lg:gap-[0.833vw] rounded-md lg:rounded-[0.4vw] border border-foreground/12 bg-card px-3.5 lg:px-[0.972vw] py-2.5 lg:py-[0.694vw]"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm lg:text-[0.972vw] font-medium">
                      {a.label}
                    </span>
                    <div className="flex items-center gap-1 lg:gap-[0.278vw] rounded-lg lg:rounded-[0.694vw] border border-foreground/15 px-2 lg:px-[0.556vw] py-1 lg:py-[0.278vw]">
                      <input
                        type="number"
                        min={1}
                        max={800}
                        step="any"
                        value={a.radiusKm}
                        onChange={(e) => setAreaRadius(i, Number(e.target.value))}
                        className="w-12 lg:w-[3.5vw] bg-transparent text-xs lg:text-[0.833vw] font-medium text-foreground/70 outline-none"
                        aria-label={`Radius in kilometres for ${a.label}`}
                      />
                      <span className="text-xs lg:text-[0.833vw] font-medium text-foreground/45">
                        km
                      </span>
                    </div>
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
              <p className="mt-4 lg:mt-[1.111vw] text-xs lg:text-[0.833vw] text-foreground/45">
                Search a city above to add it. Set a radius (km) for how far you travel.
              </p>
            )}
          </Step>
        )}

        <div className="mt-auto flex items-center justify-between pt-10 lg:pt-[2.778vw]">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={cn(
              "text-sm lg:text-[0.972vw] font-medium text-foreground/55 transition-colors hover:text-foreground",
              step === 0 && "invisible",
            )}
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance || pending}
            className="rounded-md lg:rounded-[0.4vw] bg-primary px-7 lg:px-[1.944vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] font-semibold text-primary-foreground transition-[transform,opacity] hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
          >
            {step < 2 ? "Next" : pending ? "Saving..." : "Finish setup"}
          </button>
        </div>
      </main>
    </div>
  )
}

const inputCls =
  "w-full rounded-md lg:rounded-[0.4vw] border border-foreground/15 bg-card px-3.5 lg:px-[0.972vw] py-3 lg:py-[0.833vw] text-[15px] lg:text-[1.042vw] text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"

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
      <div className="mt-8 lg:mt-[2.222vw] space-y-4 lg:space-y-[1.111vw]">{children}</div>
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
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <label className="text-[13px] lg:text-[0.903vw] font-medium text-foreground/75">{label}</label>
      {children}
    </div>
  )
}
