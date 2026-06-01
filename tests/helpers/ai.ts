/**
 * AI mock harness.
 *
 * Tests must NEVER hit real LLM APIs. This module provides:
 *
 *   1. `mockAiCache(scriptedResponses)` — replaces `cachedGenerateObject`
 *      and `cachedGenerateText` from `@/lib/ai/cache` with a stub that
 *      returns deterministic outputs in order. If the test makes more
 *      calls than scripted, the helper throws — forcing the test to
 *      explicitly script every AI interaction.
 *
 *   2. `mockAiClient()` — replaces `@/lib/ai/client` so any `getModel()`
 *      caller gets back a stub LanguageModel that's never actually
 *      invoked (because the cache wrapper is mocked above it).
 *
 * Both mocks must be installed via `vi.mock(...)` at the top of the test
 * file. Vitest hoists `vi.mock` calls, so the factories below are called
 * during module init.
 */

import { vi } from 'vitest'
import type { ZodType } from 'zod'

type ScriptedTextResponse = {
  kind: 'text'
  text: string
  tokensIn?: number
  tokensOut?: number
}

type ScriptedObjectResponse<T = unknown> = {
  kind: 'object'
  object: T
  tokensIn?: number
  tokensOut?: number
}

type ScriptedResponse = ScriptedTextResponse | ScriptedObjectResponse

const queue: ScriptedResponse[] = []
const calls: Array<{
  kind: 'text' | 'object'
  systemPrompt: string
  userPrompt: string
  schemaName?: string
}> = []

export function scriptAiText(text: string, opts?: { tokensIn?: number; tokensOut?: number }): void {
  queue.push({ kind: 'text', text, ...opts })
}

export function scriptAiObject<T>(
  object: T,
  opts?: { tokensIn?: number; tokensOut?: number },
): void {
  queue.push({ kind: 'object', object, ...opts })
}

export function resetAiMocks(): void {
  queue.length = 0
  calls.length = 0
}

export function getAiCalls() {
  return [...calls]
}

export function getAiCallCount(): number {
  return calls.length
}

export function mockAiCache() {
  return {
    cachedGenerateText: vi.fn(
      async (args: { systemPrompt: string; userPrompt: string; modelLabel: string }) => {
        const next = queue.shift()
        if (!next) {
          throw new Error(
            `mockAiCache: cachedGenerateText was called but no response was scripted. ` +
              `Add scriptAiText(...) before the action runs.`,
          )
        }
        if (next.kind !== 'text') {
          throw new Error(
            `mockAiCache: scripted response was an object, but cachedGenerateText was called. ` +
              `Did you mean scriptAiText(...)?`,
          )
        }
        calls.push({
          kind: 'text',
          systemPrompt: args.systemPrompt,
          userPrompt: args.userPrompt,
        })
        return {
          text: next.text,
          tokensIn: next.tokensIn ?? 0,
          tokensOut: next.tokensOut ?? 0,
          cacheHit: false,
        }
      },
    ),
    cachedGenerateObject: vi.fn(
      async <T>(args: {
        systemPrompt: string
        userPrompt: string
        modelLabel: string
        schemaName: string
        schema: ZodType<T>
      }) => {
        const next = queue.shift()
        if (!next) {
          throw new Error(
            `mockAiCache: cachedGenerateObject was called but no response was scripted. ` +
              `Add scriptAiObject(...) before the action runs.`,
          )
        }
        if (next.kind !== 'object') {
          throw new Error(
            `mockAiCache: scripted response was text, but cachedGenerateObject was called. ` +
              `Did you mean scriptAiObject(...)?`,
          )
        }
        calls.push({
          kind: 'object',
          systemPrompt: args.systemPrompt,
          userPrompt: args.userPrompt,
          schemaName: args.schemaName,
        })
        // Run the scripted object through the schema so tests catch
        // schema drift between fixtures and source.
        const parsed = args.schema.parse(next.object)
        return {
          object: parsed,
          tokensIn: next.tokensIn ?? 0,
          tokensOut: next.tokensOut ?? 0,
          cacheHit: false,
        }
      },
    ),
    clearAiCache: vi.fn(),
  }
}

export function mockAiClient() {
  return {
    getModel: vi.fn(() => ({ __stub: true } as unknown)),
    getModelLabel: vi.fn(() => 'stub:test'),
    getProvider: vi.fn(() => 'stub'),
  }
}
