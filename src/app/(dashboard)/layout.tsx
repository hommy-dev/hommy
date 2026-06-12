import { Suspense } from "react"

// Static boundary for the whole dashboard group. The child layouts
// (contractor / homeowner / admin) each `await getRequiredUser()` (cookies),
// which makes them dynamic — with `cacheComponents: true` that dynamic access
// needs a Suspense ancestor so Next can prerender a shell and stream the rest.
// This layout itself stays static (no dynamic access) so it can be that shell.
export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Suspense fallback={<DashboardBoot />}>{children}</Suspense>
}

function DashboardBoot() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <span
        aria-hidden="true"
        className="size-6 lg:size-[1.667vw] animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70"
      />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
