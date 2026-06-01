'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  setOptions,
  importLibrary,
} from '@googlemaps/js-api-loader'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type PlaceResult = {
  formattedAddress: string
  city: string
  state: string
  zipCode: string
  lat: number
  lng: number
}

interface GooglePlacesInputProps {
  value?: string
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-invalid'?: boolean
  /**
   * Autocomplete mode. `address` matches street-level results (for project
   * posting). `cities` matches city/region only (for contractor service area).
   * Default: `address`.
   */
  mode?: 'address' | 'cities'
  /** ISO 3166-1 alpha-2 country codes to restrict results to. Omit for global. */
  countries?: string[]
}

let optionsSet = false

function ensureOptions() {
  if (optionsSet) return
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
    v: 'weekly',
  })
  optionsSet = true
}

function extractAddressComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string
): string {
  const match = components.find((c) => c.types.includes(type))
  return match?.long_name ?? ''
}

function extractState(
  components: google.maps.GeocoderAddressComponent[]
): string {
  const match = components.find((c) =>
    c.types.includes('administrative_area_level_1')
  )
  if (!match) return ''
  // US short codes are 2 letters ("CA", "NY"). Elsewhere the short_name is
  // usually the same as the long_name or an ISO-ish code ("PB" for Punjab).
  // Prefer the 2-letter short when it's truly 2 letters, otherwise the
  // human-readable long_name — so "Punjab" instead of a cryptic code.
  if (match.short_name && match.short_name.length === 2) return match.short_name
  return match.long_name || match.short_name || ''
}

export function GooglePlacesInput({
  value,
  onPlaceSelect,
  placeholder = 'Search for an address...',
  className,
  disabled,
  'aria-invalid': ariaInvalid,
  mode = 'address',
  countries,
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [inputValue, setInputValue] = useState(value ?? '')
  const [prevValue, setPrevValue] = useState(value)
  const [isLoaded, setIsLoaded] = useState(false)

  // Sync internal text state when the controlled `value` prop changes
  // externally (e.g. parent reset). Set-state-during-render is React's
  // documented pattern for "store information from previous renders" —
  // see https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // It avoids the set-state-in-effect cascade.
  if (value !== prevValue) {
    setPrevValue(value)
    setInputValue(value ?? '')
  }

  const handlePlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current
    if (!autocomplete) return

    const place = autocomplete.getPlace()
    if (!place?.geometry?.location || !place.address_components) return

    const location = place.geometry.location

    const components = place.address_components
    const city =
      extractAddressComponent(components, 'locality') ||
      extractAddressComponent(components, 'postal_town') ||
      extractAddressComponent(components, 'sublocality_level_1') ||
      extractAddressComponent(components, 'sublocality') ||
      extractAddressComponent(components, 'administrative_area_level_2') ||
      extractAddressComponent(components, 'administrative_area_level_3')

    const result: PlaceResult = {
      formattedAddress: place.formatted_address ?? '',
      city,
      state: extractState(components),
      zipCode: extractAddressComponent(components, 'postal_code'),
      lat: location.lat(),
      lng: location.lng(),
    }

    setInputValue(result.formattedAddress)
    onPlaceSelect(result)
  }, [onPlaceSelect])

  useEffect(() => {
    ensureOptions()
    let listener: google.maps.MapsEventListener | null = null

    importLibrary('places').then(() => {
      if (!inputRef.current) return
      setIsLoaded(true)

      const options: google.maps.places.AutocompleteOptions = {
        types: mode === 'cities' ? ['(cities)'] : ['geocode'],
        fields: ['address_components', 'formatted_address', 'geometry'],
      }
      // Only restrict by country when the caller explicitly asks. Omitting
      // componentRestrictions (vs. passing an empty array) yields global
      // results — the Places API treats [] as "no countries allowed".
      if (countries && countries.length > 0) {
        options.componentRestrictions = { country: countries }
      }

      const autocomplete = new google.maps.places.Autocomplete(
        inputRef.current,
        options,
      )

      autocompleteRef.current = autocomplete
      listener = autocomplete.addListener('place_changed', handlePlaceChanged)
    })

    return () => {
      if (listener) google.maps.event.removeListener(listener)
    }
  }, [handlePlaceChanged, mode, countries])

  return (
    <Input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder={isLoaded ? placeholder : 'Loading...'}
      className={cn(className)}
      disabled={disabled || !isLoaded}
      aria-invalid={ariaInvalid}
      autoComplete="off"
    />
  )
}
