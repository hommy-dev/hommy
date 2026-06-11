"use client"

import { useEffect, useRef, useState } from "react"
import { importLibrary } from "@googlemaps/js-api-loader"
import { ensureGoogleMapsOptions } from "@/lib/google-maps"
import { cn } from "@/lib/utils"

const KM_TO_METERS = 1000

function readPrimaryColor() {
  if (typeof window === "undefined") return "#1f00ce"
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim()
  return v || "#1f00ce"
}

export type CoverageChange = { lat: number; lng: number; radiusKm: number }

/**
 * A draggable, resizable coverage circle. The contractor picks a place (initial
 * `center`), then drags the circle's edge to resize or its centre handle to move
 * it — both flow back through `onChange`. The radius input stays in sync. No
 * freehand drawing (too fiddly for the use case, and the Drawing library was
 * removed in Maps JS v3.65).
 */
export function CoverageAreaEditor({
  center,
  radiusKm,
  onChange,
  className,
}: {
  center: { lat: number; lng: number }
  radiusKm: number
  onChange: (c: CoverageChange) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // Last value we pushed to (or read from) the circle, to break echo loops
  // between the map handles and the controlled radius input.
  const lastRef = useRef({ lat: center.lat, lng: center.lng, radiusKm: Math.round(radiusKm) })

  const [ready, setReady] = useState(false)

  // Init map + editable circle once.
  useEffect(() => {
    let cancelled = false
    ensureGoogleMapsOptions()
    void importLibrary("maps")
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const color = readPrimaryColor()

        const map = new maps.Map(containerRef.current, {
          center,
          zoom: 9,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          keyboardShortcuts: false,
          gestureHandling: "cooperative",
        })

        const circle = new maps.Circle({
          map,
          center,
          radius: Math.max(1, radiusKm) * KM_TO_METERS,
          editable: true,
          draggable: true,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.12,
        })

        const emit = () => {
          const c = circle.getCenter()
          if (!c) return
          const lat = c.lat()
          const lng = c.lng()
          const r = Math.max(1, Math.round(circle.getRadius() / KM_TO_METERS))
          lastRef.current = { lat, lng, radiusKm: r }
          onChangeRef.current({ lat, lng, radiusKm: r })
        }
        circle.addListener("radius_changed", emit)
        circle.addListener("center_changed", emit)

        mapRef.current = map
        circleRef.current = circle
        const b = circle.getBounds()
        if (b) map.fitBounds(b, 28)
        setReady(true)
      })
      .catch((err) => {
        console.error("[CoverageAreaEditor] map failed to load", err)
      })
    return () => {
      cancelled = true
    }
    // Init once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push external changes (a new place, or the radius typed in the input) onto
  // the circle. Guarded so the resulting *_changed events don't loop.
  useEffect(() => {
    const circle = circleRef.current
    const map = mapRef.current
    if (!ready || !circle || !map) return

    const last = lastRef.current
    const r = Math.max(1, Math.round(radiusKm))
    const radiusChanged = r !== last.radiusKm
    const centerChanged =
      Math.abs(center.lat - last.lat) > 1e-6 ||
      Math.abs(center.lng - last.lng) > 1e-6
    if (!radiusChanged && !centerChanged) return

    // Set lastRef first so the change listeners see "no change" and don't echo.
    lastRef.current = { lat: center.lat, lng: center.lng, radiusKm: r }
    if (centerChanged) circle.setCenter(center)
    if (radiusChanged) circle.setRadius(r * KM_TO_METERS)
    const b = circle.getBounds()
    if (b) map.fitBounds(b, 28)
    // Keyed on the primitive coords (not the `center` object, which is a new
    // reference each render) plus radius.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, center.lat, center.lng, radiusKm])

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-muted",
        className,
      )}
    >
      <div ref={containerRef} className="size-full" />

      {ready && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 lg:p-[0.556vw]">
          <p className="pointer-events-none mx-auto w-fit rounded-md lg:rounded-[0.417vw] bg-foreground/80 px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-medium text-background">
            Drag the edge to resize · drag the centre to move
          </p>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs lg:text-[0.833vw] text-muted-foreground">
            Loading map…
          </span>
        </div>
      )}
    </div>
  )
}
