// Postal codes are the supply/demand matching key (a lead's postal code is
// matched against contractors' service_areas). They are NOT US-only: formats
// vary worldwide — US "75201", UK "SW1A 1AA", Canada "K1A 0B1", India "560001",
// Brazil "01310-100". So we validate permissively and NORMALIZE both sides to a
// single canonical form (upper-case, single-spaced, trimmed) so an exact string
// match works across countries regardless of how each side typed it.

/**
 * Permissive international postal code: starts alphanumeric, then 1–11 more of
 * alphanumeric / space / hyphen (total 2–12 chars). Covers the formats above
 * without locking to any country.
 */
export const POSTAL_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/

/** Canonical form used for storage and matching. */
export function normalizePostalCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function isValidPostalCode(input: string): boolean {
  return POSTAL_CODE_RE.test(input.trim())
}
