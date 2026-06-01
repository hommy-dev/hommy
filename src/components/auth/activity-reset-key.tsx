'use client'

import { usePathname } from 'next/navigation'

/**
 * Wraps children with a `key` tied to the current pathname.
 * When cacheComponents is enabled, Next.js 16 uses the Activity API
 * to keep previous pages mounted (hidden). This means form state
 * persists when navigating between /auth/login and /auth/signup.
 * The key prop forces a full remount on navigation, clearing all
 * client state (inputs, errors, pending).
 */
export function ActivityResetKey({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <div key={pathname}>{children}</div>
}
