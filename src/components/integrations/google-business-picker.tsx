'use client'

// Business (establishment) search → returns a GooglePlaceSelection (place_id +
// basic fields). Mirrors GooglePlacesInput's headless suggestion plumbing, but
// filtered to establishments and surfacing the place_id the address input drops.

import { useCallback, useEffect, useRef, useState } from 'react'
import { importLibrary } from '@googlemaps/js-api-loader'
import { ensureGoogleMapsOptions } from '@/lib/google-maps'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { GooglePlaceSelection } from '@/lib/integrations/types'

type Suggestion = {
  placeId: string
  primary: string
  secondary: string
  prediction: google.maps.places.PlacePrediction
}

export function GoogleBusinessPicker({
  onSelect,
  disabled,
  placeholder = 'Search your business name…',
  className,
}: {
  onSelect: (selection: GooglePlaceSelection) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const requestIdRef = useRef(0)
  const skipNextFetchRef = useRef(false)

  const [inputValue, setInputValue] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ensureGoogleMapsOptions()
    importLibrary('places').then(() => setIsLoaded(true))
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const fetchSuggestions = useCallback(async (input: string) => {
    const places = await importLibrary('places')
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new places.AutocompleteSessionToken()
    }
    const request: google.maps.places.AutocompleteRequest = {
      input,
      sessionToken: sessionTokenRef.current,
      includedPrimaryTypes: ['establishment'],
    }
    const requestId = ++requestIdRef.current
    try {
      const { suggestions: results } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
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
      console.error('[GoogleBusinessPicker] suggestion fetch failed', err)
      setSuggestions([])
      setOpen(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- debounced async search */
    if (!isLoaded) return
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
    const t = setTimeout(() => void fetchSuggestions(trimmed), 250)
    return () => clearTimeout(t)
  }, [inputValue, isLoaded, fetchSuggestions])

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      setOpen(false)
      const place = suggestion.prediction.toPlace()
      try {
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'googleMapsURI',
            'rating',
            'userRatingCount',
          ],
        })
      } catch (err) {
        console.error('[GoogleBusinessPicker] place details failed', err)
        return
      }

      const selection: GooglePlaceSelection = {
        placeId: place.id,
        name: place.displayName ?? suggestion.primary,
        formattedAddress: place.formattedAddress ?? null,
        googleMapsUri: place.googleMapsURI ?? null,
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
        rating: typeof place.rating === 'number' ? place.rating : null,
        userRatingCount:
          typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      }

      skipNextFetchRef.current = true
      setInputValue('')
      setSuggestions([])
      setLoading(false)
      sessionTokenRef.current = null
      onSelect(selection)
    },
    [onSelect],
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
        placeholder={isLoaded ? placeholder : 'Loading…'}
        className={cn(className)}
        disabled={disabled || !isLoaded}
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
