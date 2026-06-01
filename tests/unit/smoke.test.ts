import { describe, expect, it } from 'vitest'

/**
 * Smoke test for the vitest harness itself. If this fails, the test
 * runner is misconfigured (alias resolution, env load, jsdom env, etc.)
 * — fix the runner before debugging anything else.
 */
describe('test harness', () => {
  it('runs assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves the @ alias', async () => {
    const { LEAD_TUNABLES } = await import('@/lib/config/tunables')
    expect(LEAD_TUNABLES).toBeDefined()
  })

  it('loads .env.test', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(process.env.PAINTPRO_AI_PROVIDER).toBe('stub')
  })
})
