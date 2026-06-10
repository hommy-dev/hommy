"use client"

import { useState, useTransition } from "react"
import {
  addServiceArea,
  removeServiceArea,
  type ServiceAreaRow,
} from "@/lib/actions/contractor-coverage"
import {
  GooglePlacesInput,
  type PlaceResult,
} from "@/components/ui/google-places-input"
import { showToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const RADII = [10, 25, 50, 100] as const

export function CoverageAreasForm({
  initialAreas,
  canManage,
}: {
  initialAreas: ServiceAreaRow[]
  canManage: boolean
}) {
  const [areas, setAreas] = useState<ServiceAreaRow[]>(initialAreas)
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [pickerKey, setPickerKey] = useState(0)
  const [radius, setRadius] = useState<number>(25)
  const [pendingAdd, startAdd] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pendingRemove, startRemove] = useTransition()

  function add() {
    if (!place) return
    const label =
      place.formattedAddress ||
      [place.city, place.state].filter(Boolean).join(", ") ||
      "Coverage area"
    startAdd(async () => {
      const res = await addServiceArea({
        label,
        lat: place.lat,
        lng: place.lng,
        radiusMiles: radius,
      })
      if (!res.success || !res.data) {
        showToast(res.success ? "Could not add area." : res.error, { type: "error" })
        return
      }
      const created = res.data
      setAreas((a) => [...a, created])
      setPlace(null)
      setPickerKey((k) => k + 1)
      showToast("Coverage area added", { type: "success" })
    })
  }

  function remove(id: string) {
    setRemovingId(id)
    startRemove(async () => {
      const res = await removeServiceArea(id)
      if (!res.success) {
        showToast(res.error, { type: "error" })
        setRemovingId(null)
        return
      }
      setAreas((a) => a.filter((x) => x.id !== id))
      setRemovingId(null)
    })
  }

  return (
    <div className="space-y-5 lg:space-y-[1.389vw]">
      {canManage && (
        <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div className="space-y-1.5 lg:space-y-[0.417vw]">
            <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
              Add a city or region
            </Label>
            <GooglePlacesInput
              key={pickerKey}
              mode="cities"
              placeholder="Search a city or town…"
              onPlaceSelect={setPlace}
              className="h-11 lg:h-[3.056vw] bg-card text-left"
            />
          </div>

          <div className="space-y-1.5 lg:space-y-[0.417vw]">
            <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
              Radius
            </Label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-11 lg:h-[3.056vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.972vw] outline-none"
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r} mi
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={add}
            disabled={!place || pendingAdd}
            size="lg"
            className="font-semibold"
          >
            {pendingAdd ? "Adding…" : "Add"}
          </Button>
        </div>
      )}

      {areas.length === 0 ? (
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
          No coverage areas yet
          {canManage ? " — add the cities you serve above." : "."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md lg:rounded-[0.556vw] border border-border">
          {areas.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 lg:gap-[0.833vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
                  {a.label ?? "Coverage area"}
                </p>
                <p className="text-[13px] lg:text-[0.903vw] text-muted-foreground">
                  {a.radiusMiles} mi radius
                </p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(a.id)}
                  disabled={pendingRemove && removingId === a.id}
                >
                  {pendingRemove && removingId === a.id ? "Removing…" : "Remove"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!canManage && areas.length > 0 ? (
        <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
          Only owners and admins can change coverage areas.
        </p>
      ) : null}
    </div>
  )
}
