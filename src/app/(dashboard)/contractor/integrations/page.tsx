import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getMembershipRole } from "@/lib/data/dashboard"
import { getContractorConnections } from "@/lib/data/integrations"
import { IntegrationsGrid } from "@/components/integrations/integrations-grid"

export default async function ContractorIntegrationsPage() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const [role, connections] = await Promise.all([
    getMembershipRole(user.id, c.id),
    getContractorConnections(c.id),
  ])
  const canManage = role === "owner" || role === "admin"

  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.944vw] font-semibold tracking-tight text-foreground">
          Integrations and connected apps
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[1.042vw] text-muted-foreground">
          Connect the tools you use every day to bring your reviews and work onto your Hommy profile.
        </p>
      </header>

      <IntegrationsGrid connections={connections} canManage={canManage} />
    </div>
  )
}
