import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRequiredUser } from "@/lib/auth/session";
import { getContractorForUser } from "@/lib/data/dashboard";
import { getContractorSetupData } from "@/lib/contractor/setup";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Set up your roofer profile",
};

export default async function OnboardingPage() {
  const user = await getRequiredUser("contractor");
  const contractor = await getContractorForUser(user.id);
  if (!contractor) redirect("/contractor");

  const { availableSubtypes, initial } = await getContractorSetupData(
    contractor,
    user.phone ?? null,
  );

  return <OnboardingWizard availableSubtypes={availableSubtypes} initial={initial} />;
}
