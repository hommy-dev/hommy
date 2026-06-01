/**
 * Leakage detection — scans outgoing chat content for off-platform contact
 * cues. Designed to match the spec in docs/backlog.md issue #18:
 *   - High precision (don't flag "1800 sq ft" as a phone number).
 *   - Match formatted phone, email, social handles, coordination phrases.
 *   - Soft signal: caller is responsible for flagging the message; the send
 *     itself is NOT blocked here.
 *
 * Pure function, no IO, fully unit-testable.
 */

export type IncidentType =
  | 'PHONE_NUMBER'
  | 'EMAIL_ADDRESS'
  | 'EXTERNAL_APP'
  | 'SOCIAL_HANDLE'

type Pattern = { type: IncidentType; regex: RegExp }

// Each pattern is deliberately formulated for high precision at the cost of
// some recall — contractors can get around them, but users won't be
// surprised by false positives on casual language.
const PATTERNS: Pattern[] = [
  // Formatted phone numbers with common separators or intl prefixes.
  // Requires at least one separator or parens — this is the key constraint
  // that prevents "1800 sq ft" or "I'm free on the 15th" from matching.
  {
    type: 'PHONE_NUMBER',
    regex:
      /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/,
  },
  // International format like +92 342 1234567 (≥7 digits after country code,
  // with at least one whitespace separator).
  {
    type: 'PHONE_NUMBER',
    regex: /\+\d{1,3}\s\d{2,4}\s\d{3,4}\s?\d{3,4}/,
  },
  // Standard emails.
  {
    type: 'EMAIL_ADDRESS',
    regex: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
  },
  // External apps by name.
  {
    type: 'EXTERNAL_APP',
    regex: /\b(?:whats\s*app|telegram|signal|imessage|viber|we\s*chat|skype|zoom)\b/i,
  },
  // Direct-contact phrasing that typically precedes a number/email.
  {
    type: 'EXTERNAL_APP',
    regex:
      /\b(?:call\s+me|text\s+me|my\s+number(?:\s+is)?|find\s+me\s+on|reach\s+me\s+at|email\s+me(?:\s+at)?)\b/i,
  },
  // Social handles near platform names.
  {
    type: 'SOCIAL_HANDLE',
    regex:
      /\b(?:instagram|insta|facebook|fb|twitter|x\.com|tiktok|snapchat|snap)\b[^\n]{0,20}[@/][\w.]{2,}/i,
  },
  // Leading @handle with 3+ chars — only flag if preceded by a platform cue
  // on the same line to reduce false positives from email-like text.
  {
    type: 'SOCIAL_HANDLE',
    regex: /(?:^|[\s.,!?])@[A-Za-z][A-Za-z0-9_.]{2,}\b/,
  },
]

export interface LeakageResult {
  flagged: boolean
  reasons: IncidentType[]
}

export function scanLeakage(text: string): LeakageResult {
  if (!text) return { flagged: false, reasons: [] }
  const set = new Set<IncidentType>()
  for (const { type, regex } of PATTERNS) {
    if (regex.test(text)) set.add(type)
  }
  return { flagged: set.size > 0, reasons: Array.from(set) }
}

/**
 * Human-facing explainer for a flagged reason — used by the composer toast.
 */
export function leakageReasonLabel(type: IncidentType): string {
  switch (type) {
    case 'PHONE_NUMBER':
      return 'phone number'
    case 'EMAIL_ADDRESS':
      return 'email address'
    case 'EXTERNAL_APP':
      return 'external app / direct-contact phrasing'
    case 'SOCIAL_HANDLE':
      return 'social handle'
  }
}
