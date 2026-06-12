import { getRequiredUser } from "@/lib/auth/session"
import { getHomeownerForUser, getHomeownerQuotes } from "@/lib/data/homeowner"
import { QuoteGroup } from "@/components/dashboard/quotes/quote-group"

export default async function HomeownerQuotesPage() {
  const user = await getRequiredUser("homeowner")
  const homeowner = await getHomeownerForUser(user.id)

  const groups = homeowner ? await getHomeownerQuotes(homeowner.id) : []

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="w-full">
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Quotes
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Compare quotes from contractors and hire the one you want.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No quotes yet. Once a contractor sends one, it’ll show up here to
          compare and accept.
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-[1.111vw]">
          {groups.map((g) => (
            <QuoteGroup key={g.leadId} group={g} />
          ))}
        </div>
      )}
    </div>
  )
}
