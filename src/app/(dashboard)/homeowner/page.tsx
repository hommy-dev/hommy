import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"

export default async function HomeownerDashboardPage() {
  const user = await getRequiredUser("homeowner")
  const firstName = (user.fullName || "there").split(" ")[0]

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Post a project and we’ll match you with vetted local roofers.
        </p>
      </header>

      <section className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-6 lg:p-[1.667vw]">
        <h2 className="text-sm lg:text-[0.972vw] font-semibold">Start a new request</h2>
        <p className="mt-1 lg:mt-[0.278vw] max-w-md lg:max-w-[31.108vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Tell us about your roofing project and start receiving quotes from
          trusted contractors near you.
        </p>
        <Button asChild size="lg" className="mt-4 lg:mt-[1.111vw]">
          <Link href="/get-a-quote">Get a quote</Link>
        </Button>
      </section>
    </div>
  )
}
