"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { startCampaign, runOutreach } from "@/lib/actions/recruitment"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

/** "Find roofers" for one uncovered area — kicks Places discovery at its centroid. */
export function FindRoofersButton({
  lat,
  lng,
  city,
  state,
}: {
  lat: number | null
  lng: number | null
  city: string | null
  state: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const disabled = lat == null || lng == null || pending

  function run() {
    if (lat == null || lng == null) return
    start(async () => {
      const res = await startCampaign({ lat, lng, city: city ?? undefined, state: state ?? undefined })
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast("Discovery started — prospects will appear shortly.", { type: "success" })
      router.refresh()
    })
  }

  return (
    <Button  variant="surface" onClick={run} disabled={disabled}>
      <Icon name="search" className="size-4 lg:size-[1.111vw]" />
      {pending ? "Starting…" : "Find roofers"}
    </Button>
  )
}

/** Send the next batch of recruitment emails to verified prospects (via Resend). */
export function ExportProspectsButton() {
  const router = useRouter()
  const [pending, start] = useTransition()

  function run() {
    start(async () => {
      const res = await runOutreach()
      if (!res.success) {
        showToast(res.error, { type: "error" })
        return
      }
      showToast(`Sent ${res.data?.sent ?? 0} of ${res.data?.selected ?? 0} emails.`, {
        type: "success",
      })
      router.refresh()
    })
  }

  return (
    <Button  onClick={run} disabled={pending} className="font-semibold">
      <Icon name="send" className="size-4 lg:size-[1.111vw]" />
      {pending ? "Sending…" : "Send to verified prospects"}
    </Button>
  )
}
