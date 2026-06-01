/**
 * Shared AI types. Every AI-generated value flows through `AISuggestion<T>`
 * so callers can render the cognitive-offload UI uniformly: a value, a
 * rationale, a confidence pill, and a model fingerprint for observability.
 *
 * Design rule: AI never auto-mutates persisted user data. AI output sits
 * either in transient form state or in a `metadata.ai*` JSONB key that
 * the user can accept (move into typed columns) or dismiss.
 */

export type AIConfidence = 'low' | 'med' | 'high'

export interface AISuggestion<T> {
  /** The structured value the AI produced. */
  value: T
  /** Plain-English explanation of how the value was derived. */
  rationale: string
  /** Confidence band; drives UI emphasis (pill color, default expand). */
  confidence: AIConfidence
  /** Model identifier for observability (e.g. "anthropic:claude-3-5-sonnet"). */
  modelUsed: string
  /** Token usage; logged for cost tracking, surfaced in admin AI rollup. */
  tokensIn: number
  tokensOut: number
  /** Cache hit info — present if the prompt cache served the output. */
  cache?: {
    hit: boolean
    /** Tokens charged at the cache-read rate (not the full input rate). */
    cachedTokens?: number
  }
  /** ISO timestamp of when the suggestion was produced. */
  computedAt: string
}

/** Helper: wrap a raw value into a suggestion shell. */
export function aiSuggestion<T>(args: {
  value: T
  rationale: string
  confidence: AIConfidence
  modelUsed: string
  tokensIn: number
  tokensOut: number
  cache?: AISuggestion<T>['cache']
}): AISuggestion<T> {
  return {
    ...args,
    computedAt: new Date().toISOString(),
  }
}
