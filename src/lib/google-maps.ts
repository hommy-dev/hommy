import { setOptions } from '@googlemaps/js-api-loader'

// The Maps JS API takes a single global `setOptions` call. Several components
// load Maps libraries independently (Places autocomplete, the coverage map
// preview), so we funnel them through this guard to set the key exactly once —
// calling setOptions again after the script has loaded logs a console warning.
let optionsSet = false

export function ensureGoogleMapsOptions() {
  if (optionsSet) return
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
    v: 'weekly',
  })
  optionsSet = true
}
