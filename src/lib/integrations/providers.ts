// Integration provider registry — the scalability seam.
//
// Providers are described here as metadata (code, not DB) so the settings UI can
// list them and the roadmap stays visible. v1 ships Google (Places API) as the
// only `available` provider; the rest are `coming_soon` placeholders. When the
// v2 OAuth providers land (Business Profile API, social), their connect/sync
// adapters attach to these same slugs — the connection schema doesn't change.

import type { IconName } from '@/components/ui/icon'

export type IntegrationCategory = 'reviews_media' | 'social' | 'productivity'

export type IntegrationCapability =
  | 'import_reviews'
  | 'import_media'
  | 'publish_post'
  | 'read_insights'
  | 'sync_documents'

export type IntegrationProvider = {
  /** Stable slug stored on `integration_connections.provider`. */
  slug: string
  displayName: string
  /** Domain shown under the name (e.g. "google.com"). */
  domain: string
  /** One-line pitch shown on the provider card. */
  tagline: string
  /** Brand logo path under /public/logo (colorful). Falls back to `icon`. */
  logo?: string
  /** Monochrome fallback icon when no brand logo exists yet. */
  icon: IconName
  category: IntegrationCategory
  capabilities: IntegrationCapability[]
  status: 'available' | 'coming_soon'
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    // Live via the Google Places API (public listing: reviews + photos, read-only).
    // Labeled "Google Business" since that's what contractors recognise. A future
    // OAuth Business Profile API (two-way sync + replies) will upgrade this same
    // slug rather than adding a second card. See docs/ROADMAP.md.
    slug: 'google_places',
    displayName: 'Google Business',
    domain: 'google.com',
    tagline: 'Pull your Google reviews and work photos onto your profile.',
    logo: '/icons/google-my-business.svg',
    icon: 'star',
    category: 'reviews_media',
    capabilities: ['import_reviews', 'import_media'],
    status: 'available',
  },
  {
    slug: 'instagram',
    displayName: 'Instagram',
    domain: 'instagram.com',
    tagline: 'Showcase your latest posts and manage them from one place.',
    logo: '/icons/instagram.svg',
    icon: 'camera',
    category: 'social',
    capabilities: ['import_media', 'publish_post', 'read_insights'],
    status: 'coming_soon',
  },
  {
    slug: 'facebook',
    displayName: 'Facebook',
    domain: 'facebook.com',
    tagline: 'Bring in your Page reviews and schedule posts.',
    logo: '/icons/facebook.svg',
    icon: 'globe',
    category: 'social',
    capabilities: ['import_reviews', 'import_media', 'publish_post'],
    status: 'coming_soon',
  },
  {
    slug: 'youtube',
    displayName: 'YouTube',
    domain: 'youtube.com',
    tagline: 'Feature your channel and project videos.',
    logo: '/icons/youtube.svg',
    icon: 'video',
    category: 'social',
    capabilities: ['import_media'],
    status: 'coming_soon',
  },
]

export const GOOGLE_PLACES_PROVIDER = 'google_places'

export function getProvider(slug: string): IntegrationProvider | undefined {
  return INTEGRATION_PROVIDERS.find((p) => p.slug === slug)
}
