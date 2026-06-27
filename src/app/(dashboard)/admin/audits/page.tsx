import { getRequiredUser } from "@/lib/auth/session"
import { getAdminCreditLog } from "@/lib/data/admin"
import { CreditLog } from "@/components/admin/credit-log"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminAuditsPage() {
  await getRequiredUser("admin")
  const rows = await getAdminCreditLog()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Audit log</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Every credit movement across the platform: grants, spends, refunds, and expiries.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon="tick-square"
          title="No activity yet"
          description="Credit grants, lead charges, wins, and refunds will appear here as they happen."
        />
      ) : (
        <CreditLog rows={rows} />
      )}
    </div>
  )
}
