// Phone normalization to E.164 (e.g. "+15551234567") — the format SMS providers
// (Twilio) require. Capture widgets vary (plain text, the country-flag input),
// so we normalize on every write AND defensively before sending, so the DB and
// the wire are always E.164 regardless of how a number was typed.
//
// We use isPossible() (length/shape) rather than isValid() (strict carrier
// rules) on purpose: it converts any plausible number — including test numbers
// like 555-xxxx — and lets the provider be the final judge of deliverability.

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

/** Launch is US (TX/FL), so a number typed without a country code is assumed US. */
const DEFAULT_COUNTRY: CountryCode = 'US'

/**
 * Convert loose phone input to E.164, or null if it isn't a plausible number.
 * A leading "+countrycode" is respected; otherwise `defaultCountry` is assumed.
 */
export function normalizeToE164(
  input: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  if (!input) return null
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry)
  return parsed?.isPossible() ? parsed.number : null
}

/** True if the input is a plausible phone number. */
export function isValidPhone(
  input: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): boolean {
  return normalizeToE164(input, defaultCountry) !== null
}
