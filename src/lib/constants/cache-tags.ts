// Cache tags — single source of truth for all cache keys
// Used with "use cache" directive and updateTag() for cache invalidation

// ============================================================
// CACHE TAG FACTORIES
// ============================================================

export function contractorProfileTag(contractorId: string) {
  return `contractor-profile-${contractorId}`
}

export function contractorsCityTag(city: string, state: string) {
  return `contractors-city-${city}-${state}`
}

export function contractorLayoutTag(contractorId: string) {
  return `contractor-layout-${contractorId}`
}

export function contractorReviewsTag(contractorId: string) {
  return `contractor-reviews-${contractorId}`
}

export function contractorLeadsTag(contractorId: string) {
  return `contractor-leads-${contractorId}`
}

// Discovery feed at /contractor — pull-side projects this contractor
// could quote on. Invalidated by: own actions (submit quote / decline),
// matching engine (when a push-lead is created so the project moves to
// the inbox), and contractor profile changes that affect eligibility
// (jobTypes, primaryServiceRadiusMiles, service_areas).
export function contractorDiscoverTag(contractorId: string) {
  return `contractor-discover-${contractorId}`
}

export function projectQuotesTag(projectId: string) {
  return `project-quotes-${projectId}`
}

export function projectTag(projectId: string) {
  return `project-${projectId}`
}

// Per-lead detail tag — invalidated when status flips (view, decline).
export function leadTag(leadId: string) {
  return `lead-${leadId}`
}

// Per-quote tag (looked up by lead).
export function quoteByLeadTag(leadId: string) {
  return `quote-by-lead-${leadId}`
}

// Per-job tag — invalidated by job status changes.
export function jobTag(jobId: string) {
  return `job-${jobId}`
}

// All jobs visible to a single user (homeowner OR contractor).
export function userJobsTag(userId: string) {
  return `user-jobs-${userId}`
}

// All projects owned by a single homeowner profile.
export function homeownerProjectsTag(profileId: string) {
  return `homeowner-projects-${profileId}`
}

// Homeowner profile lookup (by user_id).
export function homeownerProfileTag(userId: string) {
  return `homeowner-profile-user-${userId}`
}

export function howItWorksTag() {
  return 'how-it-works'
}

// All site-visit fees scoped to a single contractor — invalidated when a
// fee is requested, paid, credited, or refunded.
export function siteVisitFeesContractorTag(contractorId: string) {
  return `site-visit-fees-contractor-${contractorId}`
}

// Site-visit fees scoped to a single project — invalidated by the same
// transitions for the homeowner's project view.
export function siteVisitFeesProjectTag(projectId: string) {
  return `site-visit-fees-project-${projectId}`
}

export function staticContentTag(key: string) {
  return `static-${key}`
}

// ============================================================
// CACHE INVALIDATION MAP
// Maps mutations to the cache tags they should invalidate
// ============================================================

export const CACHE_INVALIDATION_MAP = {
  // Contractor mutations
  updateContractorProfile: [
    (contractorId: string, data?: { primaryCity?: string; primaryState?: string }) => [
      contractorProfileTag(contractorId),
      contractorLayoutTag(contractorId),
      data?.primaryCity && data?.primaryState
        ? contractorsCityTag(data.primaryCity, data.primaryState)
        : null,
    ].filter(Boolean),
  ],
  updateContractorEligibility: [
    // Profile edits that change discovery-feed eligibility:
    // jobTypes, primaryServiceRadiusMiles, primaryLat/Lng, service_areas.
    (contractorId: string) => [contractorDiscoverTag(contractorId)],
  ],
  updatePortfolio: [
    (contractorId: string) => [contractorProfileTag(contractorId)],
  ],

  // Quote mutations
  submitQuote: [
    (_quoteId: string, data: { projectId: string; contractorId: string }) => [
      projectQuotesTag(data.projectId),
      contractorLeadsTag(data.contractorId),
      contractorDiscoverTag(data.contractorId),
    ],
  ],
  acceptQuote: [
    (_quoteId: string, data: { projectId: string; contractorId: string }) => [
      projectQuotesTag(data.projectId),
      contractorLeadsTag(data.contractorId),
      contractorDiscoverTag(data.contractorId),
    ],
  ],
  declineLead: [
    (_leadId: string, data: { contractorId: string }) => [
      contractorLeadsTag(data.contractorId),
      contractorDiscoverTag(data.contractorId),
    ],
  ],

  // Payment mutations
  releasePayment: [
    (_jobId: string, data: { contractorId: string }) => [
      contractorLayoutTag(data.contractorId),
    ],
  ],

  // Review mutations
  submitReview: [
    (_reviewId: string, data: { contractorId: string }) => [
      contractorReviewsTag(data.contractorId),
      contractorProfileTag(data.contractorId),
    ],
  ],

  // Admin mutations
  approveContractor: [
    (_contractorId: string, data: { primaryCity?: string; primaryState?: string }) => [
      data?.primaryCity && data?.primaryState
        ? contractorsCityTag(data.primaryCity, data.primaryState)
        : null,
    ].filter(Boolean),
  ],
} as const

// ============================================================
// TYPE HELPERS
// ============================================================

export type CacheTag =
  | ReturnType<typeof contractorProfileTag>
  | ReturnType<typeof contractorsCityTag>
  | ReturnType<typeof contractorLayoutTag>
  | ReturnType<typeof contractorReviewsTag>
  | ReturnType<typeof contractorLeadsTag>
  | ReturnType<typeof contractorDiscoverTag>
  | ReturnType<typeof projectQuotesTag>
  | ReturnType<typeof projectTag>
  | ReturnType<typeof leadTag>
  | ReturnType<typeof quoteByLeadTag>
  | ReturnType<typeof jobTag>
  | ReturnType<typeof userJobsTag>
  | ReturnType<typeof homeownerProjectsTag>
  | ReturnType<typeof homeownerProfileTag>
  | ReturnType<typeof howItWorksTag>
  | ReturnType<typeof staticContentTag>
