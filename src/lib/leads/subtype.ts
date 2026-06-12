// Lead subtypes. A homeowner can pick more than one ("leak + storm damage"), or
// the "Not sure" catch-all when they just want a roofer to assess. Subtype is
// the homeowner's INITIAL INTENT, not the final job scope — the real scope is
// settled later in the quote/project flow. "Not sure" is a sentinel: it's a
// valid lead value but deliberately NOT in services.subtypes (which doubles as
// the contractor "services offered" menu).

export const NOT_SURE_SUBTYPE = 'Not sure'

/**
 * Read the human-readable subtype(s) out of a lead's serviceDetails jsonb,
 * tolerating both the current shape ({ subtypes: string[] }) and the legacy
 * single ({ subtype: string }). Returns a comma-joined label, or null.
 */
export function subtypeList(
  serviceDetails: Record<string, unknown> | null | undefined,
): string[] {
  const sd = serviceDetails ?? {}
  return Array.isArray(sd.subtypes)
    ? sd.subtypes.filter((s): s is string => typeof s === 'string')
    : typeof sd.subtype === 'string'
      ? [sd.subtype]
      : []
}

export function subtypeLabel(
  serviceDetails: Record<string, unknown> | null | undefined,
): string | null {
  const list = subtypeList(serviceDetails)
  return list.length > 0 ? list.join(', ') : null
}
