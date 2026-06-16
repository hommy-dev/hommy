"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SetupModal, type SetupData } from "@/components/dashboard/setup-modal"
import {
  updateBusinessProfile,
  submitVerification,
} from "@/lib/actions/profile"

type Initial = {
  logoUrl: string | null
  companyName: string
  phone: string
  bio: string
  licenseDocUrl: string | null
  insuranceDocUrl: string | null
}

/**
 * Dashboard setup prompt for unverified contractors: a card plus the setup
 * modal, which auto-opens once so they can finish in place instead of seeing an
 * empty dashboard.
 */
export function SetupGate({ initial }: { initial: Initial }) {
  const router = useRouter()
  // Auto-open once on mount so the contractor can finish setup in place.
  const [open, setOpen] = useState(true)

  async function handleSubmit(data: SetupData) {
    const profile = await updateBusinessProfile({
      companyName: data.companyName,
      phone: data.phone,
      bio: data.bio,
      logoUrl: data.logoUrl,
    })
    if (!profile.success) return { ok: false, error: profile.error }

    const verified = await submitVerification({
      licenseDocUrl: data.licenseDocUrl,
      insuranceDocUrl: data.insuranceDocUrl,
    })
    return verified.success ? { ok: true } : { ok: false, error: verified.error }
  }

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4 lg:gap-[1.111vw] rounded-2xl lg:rounded-[1.111vw] border border-primary/15 bg-accent/50 p-5 lg:p-[1.389vw]">
        <div>
          <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
            Finish setting up
          </h2>
          <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-foreground/60">
            Add your details, license, and insurance to start winning jobs.
            Takes about a minute.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Finish setup
        </button>
      </section>

      <SetupModal
        open={open}
        onOpenChange={setOpen}
        initial={initial}
        onSubmit={handleSubmit}
        onDone={() => router.refresh()}
      />
    </>
  )
}
