/**
 * PII redaction before any LLM call. Reuses the leakage scanner regexes —
 * if a pattern is good enough to flag a contractor for off-platform contact,
 * it's good enough to scrub before we ship the text to a third-party LLM.
 *
 * Replaces matches with placeholder tokens the model can still reason about
 * structurally (so "call me at [PHONE]" reads naturally), and returns a map
 * of the scrubbed values so callers can surface them back to the user
 * locally without re-sending them to the model.
 *
 * Pure function. Server-side only by convention; safe in the browser too.
 */

const PII_PATTERNS = [
  {
    label: 'PHONE',
    regex:
      /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g,
  },
  {
    label: 'PHONE',
    regex: /\+\d{1,3}\s\d{2,4}\s\d{3,4}\s?\d{3,4}/g,
  },
  {
    label: 'EMAIL',
    regex: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi,
  },
  // Street-style addresses: "123 Main St", "1 Calle de la Paloma 4B".
  // Conservative — requires a digit prefix and a street-suffix word so
  // we don't strip every numeric phrase.
  {
    label: 'ADDRESS',
    regex:
      /\b\d{1,5}\s+[A-Za-z0-9'.,\- ]{2,40}\b(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Way|Court|Ct|Place|Pl|Plaza|Highway|Hwy|Parkway|Pkwy|Calle|Carrer)\b/gi,
  },
] as const

export interface RedactionResult {
  /** Text with all PII replaced by `[LABEL]` tokens. */
  text: string
  /** Map of label → original values, in encounter order. */
  found: { label: string; value: string }[]
}

export function redactPii(input: string): RedactionResult {
  if (!input) return { text: input, found: [] }
  const found: { label: string; value: string }[] = []
  let text = input
  for (const { label, regex } of PII_PATTERNS) {
    text = text.replace(regex, (match) => {
      found.push({ label, value: match })
      return `[${label}]`
    })
  }
  return { text, found }
}

/**
 * Apply redaction to all string values inside a structured object (deep).
 * Useful for redacting form payloads before serializing them into prompts.
 * Numbers, booleans, and arrays are walked; functions/symbols are dropped.
 */
export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redactPii(value).text as unknown as T
  if (Array.isArray(value)) return value.map(redactDeep) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v)
    return out as unknown as T
  }
  return value
}
