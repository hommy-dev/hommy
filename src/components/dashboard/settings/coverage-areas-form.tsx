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
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { coverageSummary } from "@/lib/coverage"
import {
  CoverageAreaEditor,
  type CoverageChange,
} from "./coverage-area-editor"

const DEFAULT_RADIUS_KM = 40

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
  // The (possibly map-edited) centre and radius of the area being added.
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM)
  const [pendingAdd, startAdd] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pendingRemove, startRemove] = useTransition()

  function selectPlace(p: PlaceResult) {
    setPlace(p)
    setCenter({ lat: p.lat, lng: p.lng })
  }

  function onEdit(c: CoverageChange) {
    setCenter({ lat: c.lat, lng: c.lng })
    setRadiusKm(c.radiusKm)
  }

  function resetDraft() {
    setPlace(null)
    setCenter(null)
    setPickerKey((k) => k + 1)
  }

  function add() {
    if (!place || !center) return
    if (!(radiusKm >= 1)) {
      showToast("Enter a radius of at least 1 km.", { type: "error" })
      return
    }
    const label =
      place.formattedAddress ||
      [place.city, place.state].filter(Boolean).join(", ") ||
      "Coverage area"

    startAdd(async () => {
      const res = await addServiceArea({
        type: "circle",
        label,
        lat: center.lat,
        lng: center.lng,
        radiusKm,
      })
      if (!res.success || !res.data) {
        showToast(res.success ? "Could not add area." : res.error, { type: "error" })
        return
      }
      setAreas((a) => [...a, res.data!])
      resetDraft()
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
        <div className="space-y-3 lg:space-y-[0.833vw]">
          <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1.5 lg:space-y-[0.417vw]">
              <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
                Add a place or area
              </Label>
              <GooglePlacesInput
                key={pickerKey}
                mode="address"
                placeholder="Search a city, area, or place…"
                onPlaceSelect={selectPlace}
                className="h-11 lg:h-[3.056vw] bg-card text-left"
              />
            </div>

            <div className="space-y-1.5 lg:space-y-[0.417vw]">
              <Label className="text-sm lg:text-[0.972vw] font-medium text-foreground/80">
                Radius (km)
              </Label>
              <Input
                type="number"
                min={1}
                max={800}
                step="any"
                value={Number.isFinite(radiusKm) ? radiusKm : ""}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="h-11 lg:h-[3.056vw] w-28 lg:w-[8vw] bg-card"
              />
            </div>
          </div>

          {place && center ? (
            <div className="space-y-1.5 lg:space-y-[0.417vw]">
              <CoverageAreaEditor
                center={center}
                radiusKm={radiusKm}
                onChange={onEdit}
                className="h-64 lg:h-[18vw] w-full"
              />
              <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
                Serving a {Number.isFinite(radiusKm) ? radiusKm : 0} km radius around{" "}
                <span className="font-medium text-foreground/80">
                  {place.city || place.formattedAddress}
                </span>
                . Drag the circle to fine-tune, then add it.
              </p>
            </div>
          ) : (
            <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
              Search a place or area to set the region you want leads from.
            </p>
          )}

          <Button
            onClick={add}
            disabled={!place || pendingAdd}
            size="lg"
            className="font-semibold"
          >
            {pendingAdd ? "Adding…" : "Add coverage area"}
          </Button>
        </div>
      )}

      {areas.length === 0 ? (
        <EmptyState
          size="sm"
          icon="location"
          title="No coverage areas yet"
          description={
            canManage
              ? "Add the cities and regions you serve above so we can match you to nearby jobs."
              : "This company hasn't set the areas they serve yet."
          }
        />
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
                  {coverageSummary(a)}
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
