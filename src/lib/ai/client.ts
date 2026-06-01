/**
 * Provider-agnostic AI client. Three named slots — `fast`, `smart`, `vision`
 * — that the rest of the codebase calls without caring which provider sits
 * underneath. Switching providers is a config change, not a code change.
 *
 * v1-final default: Google Gemini 2.5 Flash-Lite (single model across all
 * three slots — Flash-Lite is fast and cheap enough for the `fast` slot,
 * capable enough for the conversational/structured workloads we run, and
 * vision-capable). Anthropic / OpenAI remain as drop-in alternatives
 * selectable via env.
 *
 * Env contract:
 *   - GOOGLE_GENERATIVE_AI_API_KEY (required when PAINTPRO_AI_PROVIDER=google, default)
 *   - ANTHROPIC_API_KEY            (required when PAINTPRO_AI_PROVIDER=anthropic)
 *   - OPENAI_API_KEY               (required when PAINTPRO_AI_PROVIDER=openai)
 *   - PAINTPRO_AI_PROVIDER ∈ "google" | "anthropic" | "openai" (default "google")
 *   - PAINTPRO_AI_MODEL_FAST   (override; default per provider)
 *   - PAINTPRO_AI_MODEL_SMART  (override)
 *   - PAINTPRO_AI_MODEL_VISION (override)
 *
 * Server-only — never import from client components.
 */

import 'server-only'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

type Slot = 'fast' | 'smart' | 'vision'
type Provider = 'google' | 'anthropic' | 'openai'

const DEFAULTS: Record<Provider, Record<Slot, string>> = {
  google: {
    // Flash-Lite is fine for trivial classification, but it degenerate-loops
    // on schema-constrained generations with short/ambiguous user input
    // (observed: posting-wizard turns burning 65k tokens of "ze\nze\nze…"
    // until they hit the output cap). Anything that calls generateObject
    // must run on full Flash.
    fast:   'gemini-2.5-flash-lite',
    smart:  'gemini-2.5-flash',
    vision: 'gemini-2.5-flash',
  },
  anthropic: {
    fast:   'claude-haiku-4-5',
    smart:  'claude-sonnet-4-6',
    vision: 'claude-sonnet-4-6',
  },
  openai: {
    fast:   'gpt-4o-mini',
    smart:  'gpt-4o',
    vision: 'gpt-4o',
  },
}

function resolveProvider(): Provider {
  const v = process.env.PAINTPRO_AI_PROVIDER
  if (v === 'anthropic') return 'anthropic'
  if (v === 'openai') return 'openai'
  return 'google'
}

function resolveModelId(provider: Provider, slot: Slot): string {
  const envKey = `PAINTPRO_AI_MODEL_${slot.toUpperCase()}` as const
  return process.env[envKey] ?? DEFAULTS[provider][slot]
}

function buildModel(slot: Slot): LanguageModel {
  const provider = resolveProvider()
  const id = resolveModelId(provider, slot)
  if (provider === 'anthropic') return anthropic(id)
  if (provider === 'openai') return openai(id)
  return google(id)
}

/**
 * Lazy singletons. The `LanguageModel` shape is cheap, but provider clients
 * may open keep-alive connections on first use.
 */
let _fast: LanguageModel | null = null
let _smart: LanguageModel | null = null
let _vision: LanguageModel | null = null

export const ai = {
  /** Cheap + fast — short structured outputs, classification, sentiment. */
  fast(): LanguageModel {
    return (_fast ??= buildModel('fast'))
  },
  /** Reasoning workhorse — quote diff, painter coaching, plain-English summaries. */
  smart(): LanguageModel {
    return (_smart ??= buildModel('smart'))
  },
  /** Vision-capable — photo analysis, COI extraction. */
  vision(): LanguageModel {
    return (_vision ??= buildModel('vision'))
  },

  /** Identifier string for observability + the AISuggestion `modelUsed` field. */
  modelLabel(slot: Slot): string {
    const provider = resolveProvider()
    return `${provider}:${resolveModelId(provider, slot)}`
  },
}

export type AISlot = Slot
