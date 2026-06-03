import type { Contractor } from "@/lib/data/dashboard"

export type VerificationState =
  | "verified"
  | "rejected"
  | "in_review"
  | "not_started"

/**
 * Resolves the contractor's verification state. We don't store a separate
 * "submitted" timestamp, so "in review" is inferred from the presence of both
 * documents while the status is still pending.
 */
export function getVerificationState(
  c: Pick<Contractor, "verificationStatus" | "licenseDocUrl" | "insuranceDocUrl">,
): VerificationState {
  if (c.verificationStatus === "verified") return "verified"
  if (c.verificationStatus === "rejected") return "rejected"
  const submitted = Boolean(c.licenseDocUrl && c.insuranceDocUrl)
  return submitted ? "in_review" : "not_started"
}

/** The engagement gate: only verified contractors may engage (spend credits) on a lead. */
export function canEngageLeads(c: Pick<Contractor, "verificationStatus">): boolean {
  return c.verificationStatus === "verified"
}
