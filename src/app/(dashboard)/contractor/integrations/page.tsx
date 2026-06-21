import { getIntegrationsData } from "@/lib/data/integrations"
import { IntegrationsGrid } from "@/components/integrations/integrations-grid"

export default function ContractorIntegrationsPage() {
  // Not awaited: the static header + provider cards render instantly; only the
  // connected-state (Switch + manage dialog) streams in via the grid's Suspense.
  const dataPromise = getIntegrationsData()

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

      <IntegrationsGrid dataPromise={dataPromise} />
    </div>
  )
}
