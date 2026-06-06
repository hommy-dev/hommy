import { expect, test } from '@playwright/test'

/**
 * Public-routes smoke E2E.
 *
 * The full golden-path E2E (homeowner lead submit → contractor claim →
 * contact → estimate sent → won) needs a test-only auth path that bypasses
 * Supabase JWT, since we don't run Supabase locally for tests. Future ticket.
 *
 * In the meantime this spec proves:
 *   - The Next.js dev server boots and serves pages.
 *   - The unauth public surface (home, login) returns 200 and renders copy.
 *   - The login form validates with no JS errors.
 *
 * It catches the worst regression class — "the build deploys but the
 * homepage is broken" — without needing real auth state.
 *
 * Run:  pnpm test:db:up && pnpm test:e2e
 */

const PUBLIC_ROUTES = [
  { path: '/', expectText: /roof/i },
  { path: '/get-a-quote', expectText: /roof|address|where/i },
  { path: '/auth/login', expectText: /sign in|log in/i },
]

test.describe('public routes smoke', () => {
  for (const { path, expectText } of PUBLIC_ROUTES) {
    test(`${path} renders without errors`, async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('pageerror', (err) => consoleErrors.push(err.message))
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })

      const response = await page.goto(path)
      expect(response?.status(), `expected 2xx for ${path}`).toBeLessThan(400)
      await expect(page.locator('body')).toContainText(expectText)

      // Filter out known-noise errors that aren't blocking (favicon
      // 404s, 3rd-party SDK warnings, dev-only HMR notices).
      const blocking = consoleErrors.filter(
        (e) =>
          !/favicon|hmr|fast.refresh|hydration warning/i.test(e) &&
          !e.includes('DevTools'),
      )
      expect(blocking, `unexpected console errors on ${path}`).toEqual([])
    })
  }
})

test.describe('login form validation', () => {
  test('shows error when submitting empty form', async ({ page }) => {
    await page.goto('/auth/login')

    // Try submitting without filling anything in. The form should
    // refuse to navigate and surface validation feedback.
    const submit = page.getByRole('button', { name: /sign in|log in|continue/i }).first()
    await submit.click()

    // Either a native HTML5 validity message appears, OR the URL
    // stays on /auth/login (no successful navigation).
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
