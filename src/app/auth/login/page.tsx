import { Suspense } from 'react'
import { AuthPageShell } from '@/components/auth/auth-page-shell'
import { LoginForm } from '@/components/auth/login-form'
import { ActivityResetKey } from '@/components/auth/activity-reset-key'

export default function LoginPage() {
  return (
    <AuthPageShell variant="default">
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
    <div className="space-y-8 lg:space-y-[2.222vw] animate-pulse">
      <div className="space-y-2.5 lg:space-y-[0.694vw]">
        <div className="h-8 lg:h-[2.222vw] w-40 lg:w-[11.111vw] rounded-md lg:rounded-[0.556vw] bg-muted" />
        <div className="h-4 lg:h-[1.111vw] w-64 lg:w-[17.778vw] rounded-md lg:rounded-[0.556vw] bg-muted" />
      </div>
      <div className="space-y-5 lg:space-y-[1.389vw]">
        <div className="space-y-1.5 lg:space-y-[0.417vw]">
          <div className="h-3 lg:h-[0.833vw] w-12 lg:w-[3.333vw] rounded lg:rounded-[0.324vw] bg-muted" />
          <div className="h-11 lg:h-[3.056vw] rounded-md lg:rounded-[0.556vw] bg-muted" />
        </div>
        <div className="space-y-1.5 lg:space-y-[0.417vw]">
          <div className="h-3 lg:h-[0.833vw] w-16 lg:w-[4.444vw] rounded lg:rounded-[0.324vw] bg-muted" />
          <div className="h-11 lg:h-[3.056vw] rounded-md lg:rounded-[0.556vw] bg-muted" />
        </div>
        <div className="h-11 lg:h-[3.056vw] rounded-md lg:rounded-[0.556vw] bg-muted" />
      </div>
    </div>
  )
}
