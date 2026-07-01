import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ContractorSignupForm } from "@/components/auth/contractor-signup-form";
import { ActivityResetKey } from "@/components/auth/activity-reset-key";
import { getProspectForClaim } from "@/lib/recruitment/convert";

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

  // Arrived via a claim link? Greet them by company + prefill their work email so
  // it reads as "claim your listing", not a generic signup. Cookie set by /claim.
  const prospectId = (await cookies()).get("recruit_prospect")?.value;
  const p = prospectId ? await getProspectForClaim(prospectId).catch(() => null) : null;
  const claim =
    p && !p.alreadyConverted
      ? { companyName: p.companyName, city: p.city, state: p.state, email: p.email }
      : null;

  return (
    <AuthPageShell variant="contractor">
      <ActivityResetKey>
        <ContractorSignupForm referralCode={ref} claim={claim} />
      </ActivityResetKey>
    </AuthPageShell>
  );
}
