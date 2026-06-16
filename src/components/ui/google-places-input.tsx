'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { importLibrary } from '@googlemaps/js-api-loader'
import { ensureGoogleMapsOptions } from '@/lib/google-maps'
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

type Suggestion = {
  placeId: string
  primary: string
  secondary: string
  prediction: google.maps.places.PlacePrediction
}

function componentText(
  components: google.maps.places.AddressComponent[],
  type: string,
): string {
  const match = components.find((c) => c.types.includes(type))
  return match?.longText ?? ''
}

function extractState(
  components: google.maps.places.AddressComponent[],
): string {
  const match = components.find((c) =>
    c.types.includes('administrative_area_level_1'),
  )
  if (!match) return ''
  // US short codes are 2 letters ("CA", "NY"). Elsewhere prefer the readable
  // long name over a cryptic short code ("Punjab" not "PB").
  if (match.shortText && match.shortText.length === 2) return match.shortText
  return match.longText || match.shortText || ''
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
  const rootRef = useRef<HTMLDivElement>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  // Guards against out-of-order responses: only the newest request may render.
  const requestIdRef = useRef(0)
  // When we set the input text ourselves (after a pick, or a pre-filled initial
  // value), skip the next debounced fetch so the dropdown doesn't open on its own.
  const skipNextFetchRef = useRef(
    typeof value === 'string' && value.trim().length >= 3,
  )

  const [inputValue, setInputValue] = useState(value ?? '')
  const [prevValue, setPrevValue] = useState(value)
  const [isLoaded, setIsLoaded] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  // Sync internal text when the controlled `value` changes externally (parent
  // reset). Set-state-during-render is React's documented pattern for this.
  if (value !== prevValue) {
    setPrevValue(value)
    setInputValue(value ?? '')
    setSuggestions([])
    setOpen(false)
  }

  // Load the Places library once.
  useEffect(() => {
    ensureGoogleMapsOptions()
    importLibrary('places').then(() => setIsLoaded(true))
  }, [])

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const fetchSuggestions = useCallback(
    async (input: string) => {
      const places = await importLibrary('places')
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new places.AutocompleteSessionToken()
      }

      const request: google.maps.places.AutocompleteRequest = {
        input,
        sessionToken: sessionTokenRef.current,
      }
      if (mode === 'cities') request.includedPrimaryTypes = ['(cities)']
      if (countries && countries.length > 0) {
        request.includedRegionCodes = countries.map((c) => c.toLowerCase())
      }

      const requestId = ++requestIdRef.current
      try {
        const { suggestions: results } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        // A newer keystroke already fired — drop this stale response.
        if (requestId !== requestIdRef.current) return

        const mapped: Suggestion[] = results
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => p !== null)
          .map((p) => ({
            placeId: p.placeId,
            primary: p.mainText?.text ?? p.text.text,
            secondary: p.secondaryText?.text ?? '',
            prediction: p,
          }))

        setSuggestions(mapped)
        setActiveIndex(-1)
        setOpen(mapped.length > 0)
        setLoading(false)
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        console.error('[GooglePlacesInput] suggestion fetch failed', err)
        setSuggestions([])
        setOpen(false)
        setLoading(false)
      }
    },
    [mode, countries],
  )

  // Debounce predictions as the user types.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- debounced async search reacting to the typed value */
    if (!isLoaded) return
    // A programmatic change (a selection) — don't refetch / reopen.
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false
      return
    }
    const trimmed = inputValue.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      requestIdRef.current++
      return
    }
    setLoading(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = setTimeout(() => {
      void fetchSuggestions(trimmed)
    }, 250)
    return () => clearTimeout(t)
    // `inputValue` is the trigger; fetchSuggestions is stable per mode/countries.
  }, [inputValue, isLoaded, fetchSuggestions])

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      setOpen(false)
      const place = suggestion.prediction.toPlace()
      try {
        await place.fetchFields({
          fields: ['formattedAddress', 'addressComponents', 'location'],
        })
      } catch (err) {
        console.error('[GooglePlacesInput] place details failed', err)
        return
      }

      const components = place.addressComponents ?? []
      const location = place.location
      if (!location) return

      const city =
        componentText(components, 'locality') ||
        componentText(components, 'postal_town') ||
        componentText(components, 'sublocality_level_1') ||
        componentText(components, 'sublocality') ||
        componentText(components, 'administrative_area_level_2') ||
        componentText(components, 'administrative_area_level_3')

      const result: PlaceResult = {
        formattedAddress: place.formattedAddress ?? suggestion.primary,
        city,
        state: extractState(components),
        zipCode: componentText(components, 'postal_code'),
        lat: location.lat(),
        lng: location.lng(),
      }

      // Skip the debounced fetch that this text change would otherwise trigger,
      // so the dropdown stays closed after a pick.
      skipNextFetchRef.current = true
      setInputValue(result.formattedAddress)
      setSuggestions([])
      setLoading(false)
      // A selection ends the autocomplete session — start a fresh token next time.
      sessionTokenRef.current = null
      onPlaceSelect(result)
    },
    [onPlaceSelect],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault()
        void handleSelect(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={isLoaded ? placeholder : 'Loading...'}
        className={cn(className)}
        disabled={disabled || !isLoaded}
        aria-invalid={ariaInvalid}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {loading && (
        <div className="pointer-events-none absolute right-3 lg:right-[0.833vw] top-1/2 -translate-y-1/2">
          <span
            aria-hidden="true"
            className="block size-4 lg:size-[1.111vw] animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70"
          />
          <span className="sr-only">Searching…</span>
        </div>
      )}

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 lg:mt-[0.417vw] max-h-72 lg:max-h-[20vw] w-full divide-y divide-border overflow-y-auto rounded-md lg:rounded-[0.556vw] border border-border bg-popover py-1 lg:py-[0.278vw] text-popover-foreground ring-1 ring-foreground/5"
        >
          {suggestions.map((s, i) => {
            const active = i === activeIndex
            return (
              <li key={s.placeId} role="option" aria-selected={active}>
                <button
                  type="button"
                  // Use onMouseDown so the selection fires before the input's
                  // blur closes the dropdown.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    void handleSelect(s)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 lg:gap-[0.139vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-left transition-colors',
                    active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                  )}
                >
                  <span className="text-sm lg:text-[0.972vw] font-medium leading-snug">
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span className="text-xs lg:text-[0.833vw] leading-snug text-muted-foreground">
                      {s.secondary}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
