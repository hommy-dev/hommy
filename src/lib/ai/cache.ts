/**
 * Prompt-caching wrapper around the Vercel AI SDK.
 *
 * Two layers:
 *   1. Provider-side prompt cache — Anthropic exposes `cache_control: 'ephemeral'`
 *      on system + tool blocks; OpenAI does this transparently. We pass the
 *      provider hint through `providerOptions.anthropic.cacheControl`.
 *   2. Application-side response cache — a deterministic key over (prompt,
 *      schema name, model id) lets us dedupe identical inputs across users.
 *      In-memory LRU at v1; Upstash Redis once usage justifies it.
 *
 * Use this wrapper for any AI call where the system prompt is stable
 * (photo analysis, COI extraction, quote diff, sentiment). Skip for
 * one-off generations.
 */

import 'server-only'
import { createHash } from 'node:crypto'
import { generateObject, generateText, type LanguageModel } from 'ai'
import type { ZodType } from 'zod'
import { AI_TUNABLES, TIME_CONSTANTS } from '@/lib/config/tunables'

// ---------------------------------------------------------------
// In-memory LRU. Keys are sha256(input); values are AI outputs.
// Size cap protects long-running serverless instances.
// ---------------------------------------------------------------

const MAX_ENTRIES = AI_TUNABLES.CACHE_MAX_ENTRIES
const TTL_MS = AI_TUNABLES.CACHE_TTL_HOURS * TIME_CONSTANTS.HOUR_MS

type CacheEntry<T> = { value: T; expiresAt: number }

const cache = new Map<string, CacheEntry<unknown>>()

function cacheKey(parts: { systemPrompt: string; userInput: string; modelLabel: string; schemaName?: string }): string {
  const canonical = JSON.stringify(parts)
  return createHash('sha256').update(canonical).digest('hex')
}

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  // Touch for LRU: re-insert at the end.
  cache.delete(key)
  cache.set(key, entry)
  return entry.value as T
}

function cacheSet<T>(key: string, value: T): void {
  if (cache.size >= MAX_ENTRIES) {
    // Drop the oldest (first-inserted) entry.
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS })
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

interface CommonArgs {
  model: LanguageModel
  modelLabel: string
  systemPrompt: string
  userPrompt: string
}

export interface CachedTextResult {
  text: string
  tokensIn: number
  tokensOut: number
  cacheHit: boolean
}

export interface CachedObjectResult<T> {
  object: T
  tokensIn: number
  tokensOut: number
  cacheHit: boolean
}

/**
 * generateText + cache. Use for plain-text outputs (rationales, summaries).
 *
 * Anthropic prompt-cache markers are passed via `providerOptions.anthropic`;
 * OpenAI ignores them silently.
 */
export async function cachedGenerateText(args: CommonArgs): Promise<CachedTextResult> {
  const key = cacheKey({
    systemPrompt: args.systemPrompt,
    userInput: args.userPrompt,
    modelLabel: args.modelLabel,
  })
  const hit = cacheGet<CachedTextResult>(key)
  if (hit) return { ...hit, cacheHit: true }

  const result = await generateText({
    model: args.model,
    system: args.systemPrompt,
    prompt: args.userPrompt,
    // Anthropic-only prompt-cache hint. Other providers (Google, OpenAI)
    // ignore unknown provider keys harmlessly; passing it unconditionally
    // keeps the call site clean if the user flips PAINTPRO_AI_PROVIDER.
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
  })

  const out: CachedTextResult = {
    text: result.text,
    tokensIn: result.usage.inputTokens ?? 0,
    tokensOut: result.usage.outputTokens ?? 0,
    cacheHit: false,
  }
  cacheSet(key, out)
  return out
}

/**
 * generateObject + cache. Use for structured outputs (photo analysis,
 * COI extraction, quote diff). Schema is passed in; result is typed.
 */
export async function cachedGenerateObject<T>(args: CommonArgs & {
  schema: ZodType<T>
  schemaName: string
}): Promise<CachedObjectResult<T>> {
  const key = cacheKey({
    systemPrompt: args.systemPrompt,
    userInput: args.userPrompt,
    modelLabel: args.modelLabel,
    schemaName: args.schemaName,
  })
  const hit = cacheGet<CachedObjectResult<T>>(key)
  if (hit) return { ...hit, cacheHit: true }

  const result = await generateObject({
    model: args.model,
    schema: args.schema,
    system: args.systemPrompt,
    prompt: args.userPrompt,
    // Our structured-output schemas top out at a few hundred tokens. Capping
    // here means a degenerate model loop fails fast instead of burning ~65k
    // output tokens before generateObject throws a parse error.
    maxOutputTokens: 2048,
    // Anthropic-only prompt-cache hint. Other providers (Google, OpenAI)
    // ignore unknown provider keys harmlessly; passing it unconditionally
    // keeps the call site clean if the user flips PAINTPRO_AI_PROVIDER.
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
  })

  const out: CachedObjectResult<T> = {
    object: result.object,
    tokensIn: result.usage.inputTokens ?? 0,
    tokensOut: result.usage.outputTokens ?? 0,
    cacheHit: false,
  }
  cacheSet(key, out)
  return out
}

/** Drop everything — used by `/api/ai/health` to verify a cold call works. */
export function clearAiCache(): void {
  cache.clear()
}
