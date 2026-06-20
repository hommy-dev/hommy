import { getRequiredUser } from "@/lib/auth/session"
import { getAdminQuotes } from "@/lib/data/admin"
import { QuotesTable } from "@/components/admin/quotes-table"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminQuotesPage() {
  await getRequiredUser("admin")
  const quotes = await getAdminQuotes()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Quotes</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Quotes sent across the platform and their acceptance status.
        </p>
      </header>

      {quotes.length === 0 ? (
        <EmptyState
          icon="paper"
          title="No quotes yet"
          description="Quotes contractors send to homeowners will show up here."
        />
      ) : (
        <QuotesTable quotes={quotes} />
      )}
    </div>
  )
}
