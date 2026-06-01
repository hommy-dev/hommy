'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { loginAction } from '@/lib/actions/auth'
import { showToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FieldErrors = Record<string, string>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [pending, startTransition] = useTransition()
  const hasShownCallbackError = useRef(false)

  useEffect(() => {
    if (hasShownCallbackError.current) return
    const err = searchParams.get('error')
    if (err === 'missing_code' || err === 'callback') {
      hasShownCallbackError.current = true
      showToast('Sign-in link expired or is invalid', { type: 'error' })
    }
  }, [searchParams])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const redirectToParam = searchParams.get('redirectTo')
      const result = await loginAction(fd)
      if (!result.success) {
        showToast(result.error, { type: 'error' })
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        return
      }
      const target =
        redirectToParam &&
        redirectToParam.startsWith('/') &&
        !redirectToParam.startsWith('//')
          ? redirectToParam
          : (result.data?.redirectTo ?? '/')
      router.push(target)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2.5">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your quotes, jobs, and payouts.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label
            htmlFor="login-email"
            className="text-xs font-medium text-foreground/80"
          >
            Email
          </Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            disabled={pending}
            className="h-11 bg-card"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={
              fieldErrors.email ? 'login-email-error' : undefined
            }
          />
          {fieldErrors.email && (
            <p id="login-email-error" className="text-xs text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="login-password"
            className="text-xs font-medium text-foreground/80"
          >
            Password
          </Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            disabled={pending}
            className="h-11 bg-card"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={
              fieldErrors.password ? 'login-password-error' : undefined
            }
          />
          {fieldErrors.password && (
            <p id="login-password-error" className="text-xs text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-sm font-semibold"
          disabled={pending}
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">
            New to RoofLink?
          </span>
        </div>
      </div>

      <Link
        href="/auth/signup/contractor"
        className="group flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 text-sm transition-colors hover:border-foreground/15 hover:bg-accent"
      >
        <span className="flex flex-col">
          <span className="font-medium text-foreground">
            Create a contractor account
          </span>
          <span className="text-xs text-muted-foreground">
            Free forever. Takes about 10 minutes.
          </span>
        </span>
        <span
          aria-hidden
          className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        >
          →
        </span>
      </Link>
    </div>
  )
}
