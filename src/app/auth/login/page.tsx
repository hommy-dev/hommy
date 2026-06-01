import { Suspense } from 'react'
import { AuthPageShell } from '@/components/auth/auth-page-shell'
import { LoginForm } from '@/components/auth/login-form'
import { ActivityResetKey } from '@/components/auth/activity-reset-key'

export default function LoginPage() {
  return (
    <AuthPageShell variant="contractor">
      <ActivityResetKey>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </ActivityResetKey>
    </AuthPageShell>
  )
}

function LoginFormFallback() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-4 w-64 rounded-md bg-muted" />
      </div>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-11 rounded-md bg-muted" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-11 rounded-md bg-muted" />
        </div>
        <div className="h-11 rounded-md bg-muted" />
      </div>
    </div>
  )
}
