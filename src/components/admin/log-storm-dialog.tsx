"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DetailDialog } from "@/components/ui/detail-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GooglePlacesInput, type PlaceResult } from "@/components/ui/google-places-input"
import { showToast } from "@/components/ui/toast"
import { createStormEvent } from "@/lib/actions/storm"

const EVENT_TYPES = [
  { value: "hail", label: "Hail" },
  { value: "high_wind", label: "High wind" },
  { value: "storm", label: "Storm" },
] as const

export function LogStormButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="font-semibold">
        <Icon name="storm" className="size-4 lg:size-[1.111vw]" />
        Log a storm
      </Button>
      <LogStormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function LogStormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [eventType, setEventType] = useState<string>("hail")
  const [severity, setSeverity] = useState("")
  const [zips, setZips] = useState("")
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [created, setCreated] = useState<{ id: string } | null>(null)

  const shareUrl =
    created && typeof window !== "undefined" ? `${window.location.origin}/storm/${created.id}` : ""

  function reset() {
    setEventType("hail")
    setSeverity("")
    setZips("")
    setPlace(null)
    setCreated(null)
  }

  function submit() {
    if (pending) return
    if (!place) {
      showToast("Pick the affected city/area first.", { type: "warning" })
      return
    }
    start(async () => {
      const res = await createStormEvent({
        eventType,
        severity: severity.trim() || undefined,
        city: place.city || undefined,
        state: place.state || undefined,
        lat: place.lat,
        lng: place.lng,
        affectedZipCodes: zips
          .split(/[,\s]+/)
          .map((z) => z.trim())
          .filter(Boolean),
      })
      if (res.success && res.data) {
        setCreated({ id: res.data.id })
        showToast("Storm logged — finding roofers in the area.", { type: "success" })
        router.refresh()
      } else {
        showToast(res.success ? "Logged." : res.error, { type: res.success ? "success" : "error" })
      }
    })
  }

  function copyShare() {
    if (!shareUrl) return
    void navigator.clipboard?.writeText(shareUrl).then(
      () => showToast("Link copied.", { type: "success" }),
      () => showToast("Couldn't copy.", { type: "error" }),
    )
  }

  return (
    <DetailDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title={created ? "Storm logged" : "Log a storm"}
      footer={
        created ? (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 lg:gap-[0.556vw]">
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={pending || !place} className="font-semibold">
              {pending ? "Logging…" : "Log storm & find roofers"}
            </Button>
          </div>
        )
      }
    >
      {created ? (
        <div className="space-y-4 lg:space-y-[1.111vw]">
          <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
            We&apos;re discovering and inviting roofers in {place?.city ?? "the area"} now. Share this
            link in local Nextdoor / Facebook groups to pull in homeowners — it opens a storm-damage
            quote form, pre-filled for this area:
          </p>
          <div className="flex items-center gap-2 lg:gap-[0.556vw]">
            <code className="min-w-0 flex-1 truncate rounded-md lg:rounded-[0.417vw] border border-border bg-muted/40 px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-xs lg:text-[0.833vw]">
              {shareUrl}
            </code>
            <Button size="sm" variant="surface" onClick={copyShare}>
              Copy
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 lg:space-y-[1.389vw]">
          <Field label="Event type">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Affected area (city)">
            <GooglePlacesInput
              mode="cities"
              placeholder="Search the city or area hit by the storm…"
              onPlaceSelect={setPlace}
            />
            {place ? (
              <p className="mt-1.5 lg:mt-[0.417vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                Selected: {[place.city, place.state].filter(Boolean).join(", ") || place.formattedAddress}
              </p>
            ) : null}
          </Field>

          <Field label="Severity (optional)">
            <Input value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="e.g. Severe, 2&quot; hail" />
          </Field>

          <Field label="Affected ZIP codes (optional, comma-separated)">
            <Input value={zips} onChange={(e) => setZips(e.target.value)} placeholder="75201, 75204, 75206" />
          </Field>
        </div>
      )}
    </DetailDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.417vw]">
      <label className="block text-xs lg:text-[0.764vw] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
