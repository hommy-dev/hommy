import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { db } from "@/lib/db"
import { services, contractorServices, serviceAreas } from "@/lib/db/schema"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export const metadata: Metadata = {
  title: "Set up your roofer profile",
}

export default async function OnboardingPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  if (!contractor) redirect("/contractor")

  const [roofing] = await db
    .select({ id: services.id, subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, "roofing"))
    .limit(1)

  const existing = roofing
    ? await db
        .select({ subtypes: contractorServices.subtypes })
        .from(contractorServices)
        .where(
          and(
            eq(contractorServices.contractorId, contractor.id),
            eq(contractorServices.serviceId, roofing.id),
          ),
        )
        .limit(1)
    : []

  const areas = await db
    .select({
      label: serviceAreas.label,
      lat: serviceAreas.lat,
      lng: serviceAreas.lng,
      radiusKm: serviceAreas.radiusKm,
    })
    .from(serviceAreas)
    .where(eq(serviceAreas.contractorId, contractor.id))

  return (
    <OnboardingWizard
      availableSubtypes={roofing?.subtypes ?? []}
      initial={{
        companyName: contractor.companyName ?? "",
        phone: user.phone ?? "",
        yearsInBusiness: contractor.yearsInBusiness ?? null,
        subtypes: existing[0]?.subtypes ?? [],
        // Only areas with coordinates can be matched/edited in the wizard.
        areas: areas
          .filter((a) => a.lat != null && a.lng != null)
          .map((a) => ({
            label: a.label ?? "Coverage area",
            lat: a.lat as number,
            lng: a.lng as number,
            radiusKm: a.radiusKm ?? 40,
          })),
      }}
    />
  )
}
