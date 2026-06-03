"use client"

import { useEffect, useRef, useState } from "react"
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
  const [open, setOpen] = useState(false)
  const autoOpened = useRef(false)
  useEffect(() => {
    if (!autoOpened.current) {
      autoOpened.current = true
      setOpen(true)
    }
  }, [])

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
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-accent/50 p-5">
        <div>
          <h2 className="font-sebenta text-lg font-bold tracking-tight">
            Finish setting up
          </h2>
          <p className="mt-0.5 text-sm text-foreground/60">
            Add your details, license, and insurance to start winning jobs.
            Takes about a minute.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
