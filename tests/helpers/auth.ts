/**
 * Auth mock for integration tests.
 *
 * `getRequiredUser()` (src/lib/auth/session.ts) hits Supabase JWT and
 * the users table. In tests, we bypass both: the test seeds a user row
 * directly via Drizzle, then this helper makes `getRequiredUser` return
 * that row regardless of the cookie/JWT state.
 *
 * Pair with `vi.mock('@/lib/auth/session', () => mockAuth())` at the top
 * of any integration test file. The default mocked user is null
 * (unauthenticated); call `signInAs(user)` inside the test body to
 * switch identity for the next server-action call.
 */

import { vi } from 'vitest'

type MockedUser = {
  id: string
  email: string
  role: 'HOMEOWNER' | 'CONTRACTOR' | 'ADMIN'
  createdAt?: Date
} | null

let currentUser: MockedUser = null

export function signInAs(user: NonNullable<MockedUser>): void {
  currentUser = user
}

export function signOut(): void {
  currentUser = null
}

export function whoAmI(): MockedUser {
  return currentUser
}

export function mockAuth() {
  return {
    getRequiredUser: vi.fn(async (requiredRole?: 'HOMEOWNER' | 'CONTRACTOR' | 'ADMIN') => {
      if (!currentUser) {
        // Real impl `redirect()`s; tests should treat this as a typed throw.
        throw new Error('NOT_AUTHENTICATED')
      }
      if (requiredRole && currentUser.role !== requiredRole) {
        throw new Error(`WRONG_ROLE expected ${requiredRole}, got ${currentUser.role}`)
      }
      return {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        createdAt: currentUser.createdAt ?? new Date(),
      }
    }),
    getOptionalUser: vi.fn(async () => {
      if (!currentUser) return null
      return {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        createdAt: currentUser.createdAt ?? new Date(),
      }
    }),
  }
}
