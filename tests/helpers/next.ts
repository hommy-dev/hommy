/**
 * Mocks for Next.js request-scoped APIs that server actions touch but that throw
 * outside a request (node/vitest env).
 *
 * Usage (top of the test file — vi.mock is hoisted):
 *   import { mockNextCache, mockNextHeaders } from '../helpers/next'
 *   vi.mock('next/cache', () => mockNextCache())
 *   vi.mock('next/headers', () => mockNextHeaders())
 */

import { vi } from 'vitest'

/** No-op cache APIs. Covers both the invalidation calls server actions make
 *  (`revalidatePath`/`revalidateTag`/`updateTag`) and the `"use cache"` helpers
 *  (`cacheLife`/`cacheTag`) that data modules import at module-load time. */
export function mockNextCache() {
  return {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    updateTag: vi.fn(),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
    unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
  }
}

/** Stub `headers()` / `cookies()` returning empty readers (used e.g. by
 *  accept-estimate for IP/UA, and by createClient — though auth is mocked). */
export function mockNextHeaders() {
  const empty = {
    get: () => null,
    getAll: () => [],
    has: () => false,
    set: () => {},
    delete: () => {},
  }
  return {
    headers: vi.fn(async () => empty),
    cookies: vi.fn(async () => empty),
  }
}
