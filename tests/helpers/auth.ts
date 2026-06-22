/**
 * Auth mock for integration tests.
 *
 * The real `getRequiredUser()` (src/lib/auth/session.ts) reads the Supabase JWT
 * + the `users` table and `redirect()`s on failure. In tests we bypass both:
 * seed a `users` row via the fixtures, then point the mock at it.
 *
 * Usage (top of the test file — vi.mock is hoisted):
 *
 *   import { mockAuth, signInAs } from '../helpers/auth'
 *   vi.mock('@/lib/auth/session', () => mockAuth())
 *   // ...inside a test:
 *   signInAs({ id: userId, email: 'c@x.com', role: 'contractor' })
 *
 * The real fn returns the FULL `users` row (lowercase role); this mirrors that
 * shape. Unauthenticated / wrong-role throw typed errors instead of redirecting.
 */

import { vi } from 'vitest'

export type Role = 'contractor' | 'homeowner' | 'admin'

export type MockUser = {
  id: string
  email: string
  role: Role
  fullName?: string | null
  phone?: string | null
  passwordSet?: boolean
  activeContractorId?: string | null
  createdAt?: Date
}

let currentUser: MockUser | null = null

export function signInAs(user: MockUser): void {
  currentUser = user
}
export function signOut(): void {
  currentUser = null
}
export function whoAmI(): MockUser | null {
  return currentUser
}

/** Expand a partial test user into the full `users`-row shape the app reads. */
function fullRow(u: MockUser) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName ?? null,
    phone: u.phone ?? null,
    role: u.role,
    passwordSet: u.passwordSet ?? true,
    activeContractorId: u.activeContractorId ?? null,
    createdAt: u.createdAt ?? new Date(),
  }
}

export function mockAuth() {
  return {
    getRequiredUser: vi.fn(async (requiredRole?: Role) => {
      if (!currentUser) throw new Error('NOT_AUTHENTICATED')
      if (requiredRole && currentUser.role !== requiredRole) {
        throw new Error(`WRONG_ROLE expected ${requiredRole}, got ${currentUser.role}`)
      }
      return fullRow(currentUser)
    }),
    getOptionalUser: vi.fn(async () => (currentUser ? fullRow(currentUser) : null)),
    getRequiredUserId: vi.fn(async () => {
      if (!currentUser) throw new Error('NOT_AUTHENTICATED')
      return currentUser.id
    }),
  }
}
