import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ContractorSignupForm } from "@/components/auth/contractor-signup-form";
import { ActivityResetKey } from "@/components/auth/activity-reset-key";

export const metadata: Metadata = {
  title: "Become a Hommy roofer",
  description:
    "Join Hommy and get matched with homeowners who need roofing work. No charge to receive a lead. Pay only when you win the job.",
};

export default async function ContractorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <AuthPageShell variant="contractor">
      <ActivityResetKey>
        <ContractorSignupForm referralCode={ref} />
      </ActivityResetKey>
    </AuthPageShell>
  );
}
