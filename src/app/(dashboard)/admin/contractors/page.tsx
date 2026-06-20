import { getRequiredUser } from "@/lib/auth/session"
import { getAdminContractors } from "@/lib/data/admin"
import { ContractorsTable } from "@/components/admin/contractors-table"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminContractorsPage() {
  await getRequiredUser("admin")
  const contractors = await getAdminContractors()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Contractors</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          All companies — verification, members, and credits. Open one to verify it or grant credits.
        </p>
      </header>

      {contractors.length === 0 ? (
        <EmptyState
          icon="user-3"
          title="No companies yet"
          description="New companies will show up here as they sign up to Homei."
        />
      ) : (
        <ContractorsTable contractors={contractors} />
      )}
    </div>
  )
}
