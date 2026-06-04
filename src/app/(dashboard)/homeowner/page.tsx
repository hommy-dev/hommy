import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"

export default async function HomeownerDashboardPage() {
  const user = await getRequiredUser("homeowner")
  const firstName = (user.fullName || "there").split(" ")[0]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-sebenta text-2xl font-bold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Post a project and we’ll match you with vetted local roofers.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Start a new request</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Tell us about your roofing project and start receiving quotes from
          trusted contractors near you.
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/get-a-quote">Get a quote</Link>
        </Button>
      </section>
    </div>
  )
}
