// ============================================================
// HOMMY — DRIZZLE ORM SCHEMA (v2)
// Database: PostgreSQL via Supabase
// ============================================================
// Canonical model: docs/HOMMY_PLATFORM.md.
//
// IDENTITY: a contractor is a COMPANY with many member users.
//   users → contractor_members (role) → contractors (company).
//   Homeowners are AUTHENTICATED users with a 1:1 `homeowners` profile.
//
// MONEY: a credit economy. `credit_transactions` is an append-only ledger;
//   `contractors.credit_balance` is a cached projection. `plans` are data rows
//   (free + paid) granting monthly credits + seats + features. Subscriptions
//   are separate. Plan credits expire (expires_at); purchased credits don't.
//
// LEADS: free to receive (`lead_recipients` fan-out), small charge on engage,
//   full charge when a quote (`estimates`) is accepted. Capped competition +
//   SLA cascade. Reputation via `score_events` → cached `profile_score`.
//
// MESSAGING: universal polymorphic graph — conversations / participants
//   (user | contractor) / messages.
//
// MULTI-VERTICAL: `services` is the backbone; vertical-specific fields live in
//   `service_details` (jsonb). `storm_events` is a fenced roofing-only module.
//
// CONVENTIONS: UUID PKs via gen_random_uuid(); money = decimal (string, parse
//   with parseFloat for display); credits = integer; timestamps withTimezone.
// ============================================================

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  decimal,
  doublePrecision,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  customType,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// PostGIS geography column (SRID 4326). Stored as the canonical, spatially
// indexed shape used for lead matching; the app never reads it directly (it's
// derived from lat/lng/radius or polygon by a DB trigger — see migration 0006),
// so the TS type is just an opaque WKT string.
const geography = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(Geometry, 4326)'
  },
})

// ============================================================
// ENUMS
// ============================================================

export const userRole = pgEnum('user_role', ['contractor', 'homeowner', 'admin'])
export const memberRole = pgEnum('member_role', ['owner', 'admin', 'member'])
export const memberStatus = pgEnum('member_status', ['invited', 'active', 'removed'])
export const verificationStatus = pgEnum('verification_status', ['pending', 'verified', 'rejected'])

export const billingInterval = pgEnum('billing_interval', ['month', 'year'])
export const subscriptionStatus = pgEnum('subscription_status', ['active', 'past_due', 'canceled', 'trialing'])
export const creditTxnKind = pgEnum('credit_txn_kind', [
  'signup_bonus', 'purchase', 'plan_grant', 'lead_engagement', 'lead_won',
  'ai_agent', 'marketing', 'refund', 'promo', 'expiry', 'adjustment', 'referral',
])
// purchase_intents — a contractor's request to buy credits. v1 has no payment
// integration: the intent is recorded and platform admins are notified so they
// can fulfill it manually (offline payment → admin credit grant). `fulfilled`
// when the matching `purchase`/`adjustment` grant is made; `declined` otherwise.
export const purchaseIntentStatus = pgEnum('purchase_intent_status', ['requested', 'fulfilled', 'declined'])

export const leadUrgency = pgEnum('lead_urgency', ['emergency', 'within_week', 'within_month', 'planning'])
export const leadStatus = pgEnum('lead_status', ['open', 'awarded', 'closed', 'expired'])
export const leadRecipientStatus = pgEnum('lead_recipient_status', [
  'offered', 'viewed', 'engaged', 'declined', 'expired', 'lost', 'won',
])
export const projectStage = pgEnum('project_stage', [
  'new_lead', 'estimate_sent', 'in_progress', 'completed', 'lost',
])
export const estimateStatus = pgEnum('estimate_status', ['draft', 'sent', 'accepted', 'rejected'])

export const conversationType = pgEnum('conversation_type', ['direct', 'lead'])
export const participantType = pgEnum('participant_type', ['user', 'contractor'])
export const messageSenderType = pgEnum('message_sender_type', ['user', 'contractor', 'system'])
export const messageChannel = pgEnum('message_channel', ['platform', 'sms', 'email'])

export const scoreEventKind = pgEnum('score_event_kind', [
  'lead_ignored_no_reason', 'lead_ignored_with_reason', 'slow_response',
  'fast_engagement', 'quote_accepted', 'review_received', 'off_platform_flag', 'pattern_no_quotes',
])
export const reviewerType = pgEnum('reviewer_type', ['homeowner', 'contractor'])
export const activityActor = pgEnum('activity_actor', ['system', 'contractor', 'homeowner'])
export const stormEventType = pgEnum('storm_event_type', ['hail', 'high_wind', 'storm'])

// Portfolio media: a plain single image ("signal") or a before/after pair.
export const portfolioImageKind = pgEnum('portfolio_image_kind', ['single', 'before_after'])

// Integration connection lifecycle. `needs_reauth` is reserved for the v2 OAuth
// providers (Business Profile API, social) — Places uses only active/error.
export const integrationStatus = pgEnum('integration_status', ['active', 'needs_reauth', 'error', 'disconnected'])

// ============================================================
// IDENTITY
// ============================================================

// users — extends Supabase auth.users (id = auth.users uuid). Three roles.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  phone: text('phone'),
  // Optional avatar URL. Used for the platform "Hommy Support" identity (the
  // brand logo) and available for future per-user avatars.
  avatarUrl: text('avatar_url'),
  role: userRole('role').notNull(),
  // false for auto-created homeowners until they set a password (deferred-password flow)
  passwordSet: boolean('password_set').notNull().default(false),
  // The company a multi-company contractor is currently operating as. Null →
  // fall back to their first active membership. (set null if that company is gone)
  activeContractorId: uuid('active_contractor_id').references(
    (): import('drizzle-orm/pg-core').AnyPgColumn => contractors.id,
    { onDelete: 'set null' },
  ),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// contractors — THE COMPANY. No user_id (membership is separate). Wallet +
// score are cached projections of the credit_transactions / score_events ledgers.
export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  companyName: text('company_name'),
  // Stable public URL slug for /roofers/[slug] (generated once the company is
  // named; never changes after). Nullable until set; Postgres treats NULLs as
  // distinct so many unnamed companies coexist under the unique index.
  slug: text('slug'),
  bio: text('bio'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  // Optional company intro video (NOT a work case study): a short "who we are /
  // what we do" clip. Either a hosted upload (Cloudinary mp4) or a YouTube/Vimeo
  // link — both stored as a URL; the player detects which. Poster is the still
  // shown before play (derived for uploads; YouTube derives its own at render).
  introVideoUrl: text('intro_video_url'),
  introVideoPosterUrl: text('intro_video_poster_url'),
  licenseNumber: text('license_number'),
  licenseDocUrl: text('license_doc_url'),
  insuranceProvider: text('insurance_provider'),
  insurancePolicy: text('insurance_policy'),
  insuranceDocUrl: text('insurance_doc_url'),
  yearsInBusiness: integer('years_in_business'),
  verificationStatus: verificationStatus('verification_status').notNull().default('pending'),
  stripeCustomerId: text('stripe_customer_id'),
  creditBalance: integer('credit_balance').notNull().default(0),
  profileScore: integer('profile_score').notNull().default(0),
  avgResponseTimeMinutes: integer('avg_response_time_minutes'),
  avgRating: decimal('avg_rating', { precision: 3, scale: 2 }),
  totalReviews: integer('total_reviews').notNull().default(0),
  // Referral program: shareable code, the company that referred this one, and a
  // pay-once guard (set when both sides are credited on this company's verify).
  referralCode: text('referral_code'),
  referredByContractorId: uuid('referred_by_contractor_id').references((): AnyPgColumn => contractors.id, { onDelete: 'set null' }),
  referralRewardedAt: timestamp('referral_rewarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('contractors_verification_idx').on(t.verificationStatus),
  uniqueIndex('contractors_slug_uq').on(t.slug),
  uniqueIndex('contractors_referral_code_uq').on(t.referralCode),
])

// contractor_members — a user's seat in a company (+ role). Many users per company.
export const contractorMembers = pgTable('contractor_members', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: memberRole('role').notNull().default('member'),
  status: memberStatus('status').notNull().default('active'),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('contractor_members_company_user_uq').on(t.contractorId, t.userId),
  index('contractor_members_user_idx').on(t.userId),
  index('contractor_members_company_idx').on(t.contractorId),
])

// contractor_invitations — invite a teammate by email before they have an account.
export const contractorInvitations = pgTable('contractor_invitations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: memberRole('role').notNull().default('member'),
  token: text('token').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('contractor_invitations_token_uq').on(t.token),
  index('contractor_invitations_company_idx').on(t.contractorId),
])

// homeowners — 1:1 profile for a homeowner-role user. Contact lives on users;
// job/property location lives on leads.
export const homeowners = pgTable('homeowners', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('homeowners_user_uq').on(t.userId),
])

// services — the verticals. Roofing is a seed row; new services are new rows.
export const services = pgTable('services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  subtypes: jsonb('subtypes').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('services_slug_uq').on(t.slug),
])

// ============================================================
// MONEY — PLANS, SUBSCRIPTIONS, CREDITS
// ============================================================

// plans — DATA rows (free + 3 paid). Perks in `features` jsonb so tiers change
// without migrations.
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  billingInterval: billingInterval('billing_interval').notNull().default('month'),
  stripePriceId: text('stripe_price_id'),
  monthlyCredits: integer('monthly_credits').notNull().default(0),
  maxMembers: integer('max_members').notNull().default(1),
  features: jsonb('features').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('plans_slug_uq').on(t.slug),
])

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: subscriptionStatus('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('subscriptions_contractor_idx').on(t.contractorId),
  index('subscriptions_plan_idx').on(t.planId),
])

// credit_transactions — append-only ledger (source of truth). FIFO by expires_at:
// plan_grant lots carry expires_at; purchases are null (never expire).
export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  kind: creditTxnKind('kind').notNull(),
  amount: integer('amount').notNull(), // signed: + grants/purchases, - spends
  balanceAfter: integer('balance_after').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  sourceType: text('source_type'),
  sourceId: text('source_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('credit_transactions_contractor_idx').on(t.contractorId),
  index('credit_transactions_contractor_expiry_idx').on(t.contractorId, t.expiresAt),
])

// purchase_intents — v1 "buy credits" requests (no live payments yet). Each row
// is one click on "Buy credits"; platform admins are notified and settle it by
// hand (offline payment → admin grant), then mark it fulfilled.
export const purchaseIntents = pgTable('purchase_intents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
  credits: integer('credits').notNull(),
  amountCents: integer('amount_cents').notNull(),
  balanceAtRequest: integer('balance_at_request').notNull(),
  status: purchaseIntentStatus('status').notNull().default('requested'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('purchase_intents_contractor_idx').on(t.contractorId),
  index('purchase_intents_status_idx').on(t.status),
])

// ============================================================
// SUPPLY-SIDE (company-scoped)
// ============================================================

// service_areas — a company's coverage region. Two shapes:
//   • 'circle'  — CENTER POINT (lat/lng) + RADIUS (radiusKm).
//   • 'polygon' — an arbitrary ring of points (polygon: [{lat,lng}, …]).
// Both are projected into `geom` (a PostGIS geography) by a DB trigger, and lead
// matching tests the lead's point against `geom` (ST_Covers) — so circle and
// polygon areas match through one indexed predicate, worldwide. zipCode is
// optional/display only. label is the human name ("Dallas, TX").
export const serviceAreas = pgTable('service_areas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  label: text('label'),
  zipCode: text('zip_code'),
  areaType: text('area_type').notNull().default('circle'), // 'circle' | 'polygon'
  // Circle areas:
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  radiusKm: doublePrecision('radius_km'),
  /** @deprecated Superseded by radiusKm (km). Kept for back-compat; no longer read/written by the app. */
  radiusMiles: integer('radius_miles').notNull().default(25),
  // Polygon areas: ordered ring of vertices (lng/lat pairs as {lat,lng}).
  polygon: jsonb('polygon').$type<{ lat: number; lng: number }[]>(),
  // Canonical matchable shape, maintained by trigger from the fields above.
  geom: geography('geom'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('service_areas_contractor_idx').on(t.contractorId),
  index('service_areas_geom_gist').using('gist', t.geom),
])

export const contractorServices = pgTable('contractor_services', {
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  subtypes: text('subtypes').array().notNull().default(sql`'{}'::text[]`),
}, (t) => [
  primaryKey({ columns: [t.contractorId, t.serviceId] }),
  index('contractor_services_service_idx').on(t.serviceId),
])

// portfolio_projects — a company's showcased work (case studies). Public on the
// contractor profile when published. Each holds one or more media items.
export const portfolioProjects = pgTable('portfolio_projects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  serviceSubtype: text('service_subtype'),
  location: text('location'),
  coverImageUrl: text('cover_image_url'),
  isPublished: boolean('is_published').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('portfolio_projects_contractor_idx').on(t.contractorId),
])

// portfolio_images — media within a case study. `single` = one image (image_url);
// `before_after` = a pair (before_url + image_url(after)) rendered with a slider.
export const portfolioImages = pgTable('portfolio_images', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => portfolioProjects.id, { onDelete: 'cascade' }),
  kind: portfolioImageKind('kind').notNull().default('single'),
  imageUrl: text('image_url').notNull(),
  beforeUrl: text('before_url'),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('portfolio_images_project_idx').on(t.projectId),
])

// ============================================================
// LEADS → ENGAGEMENT → PROJECTS → QUOTES
// ============================================================

// leads — the homeowner's job post. Free to receive; offered to ≥engageSlots
// contractors via lead_recipients. Costs snapshot the per-service credit pricing.
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: uuid('homeowner_id').notNull().references(() => homeowners.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  serviceDetails: jsonb('service_details').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  urgency: leadUrgency('urgency').notNull().default('planning'),
  // property / job location (lives on the job, not the homeowner)
  address: text('address'),
  zipCode: text('zip_code'),
  city: text('city'),
  state: text('state'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  photoUrl: text('photo_url'),
  notes: text('notes'),
  stormEventId: uuid('storm_event_id').references(() => stormEvents.id, { onDelete: 'set null' }),
  status: leadStatus('status').notNull().default('open'),
  engageSlots: integer('engage_slots').notNull().default(3),
  engagementCreditCost: integer('engagement_credit_cost').notNull().default(0),
  awardCreditCost: integer('award_credit_cost').notNull().default(0),
  awardedTo: uuid('awarded_to').references(() => contractors.id, { onDelete: 'set null' }),
  awardedAt: timestamp('awarded_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  // Direct hire: when set, this lead was sent to exactly ONE chosen contractor
  // (no broadcast fan-out, no cascade) — see requestDirectQuote. Null = the
  // normal broadcast flow.
  targetContractorId: uuid('target_contractor_id').references(() => contractors.id, { onDelete: 'set null' }),
  // Recruitment engine: true when this open lead matched ZERO verified contractors
  // at post time (no coverage in the area). Stays a normal open lead; this is an
  // orthogonal flag (NOT a status value) so all `status='open'` flows are unchanged.
  // Flipped back to false the moment a covering contractor becomes eligible
  // (see contractor-eligible Inngest fn). The SLA cron must not auto-expire these.
  awaitingCoverage: boolean('awaiting_coverage').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('leads_status_idx').on(t.status),
  index('leads_service_idx').on(t.serviceId),
  index('leads_homeowner_idx').on(t.homeownerId),
  index('leads_awarded_to_idx').on(t.awardedTo),
  index('leads_target_contractor_idx').on(t.targetContractorId),
  index('leads_storm_event_idx').on(t.stormEventId),
  // Partial index: the recruitment engine repeatedly scans only awaiting leads.
  index('leads_awaiting_idx').on(t.awaitingCoverage).where(sql`awaiting_coverage = true`),
  // Per-city demand aggregate for SEO city pages (filters on state/city/createdAt).
  index('leads_state_city_idx').on(t.state, t.city),
])

// lead_recipients — the fan-out + cascade + per-contractor lead state.
export const leadRecipients = pgTable('lead_recipients', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  status: leadRecipientStatus('status').notNull().default('offered'),
  offeredAt: timestamp('offered_at', { withTimezone: true }).notNull().defaultNow(),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  engagedAt: timestamp('engaged_at', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  declineReason: text('decline_reason'),
  slaDeadline: timestamp('sla_deadline', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('lead_recipients_lead_contractor_uq').on(t.leadId, t.contractorId),
  index('lead_recipients_contractor_status_idx').on(t.contractorId, t.status),
  index('lead_recipients_lead_idx').on(t.leadId),
  index('lead_recipients_sla_idx').on(t.slaDeadline),
])

// contacts — a company's long-term homeowner record (one per pair).
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  homeownerId: uuid('homeowner_id').notNull().references(() => homeowners.id, { onDelete: 'cascade' }),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('contacts_contractor_homeowner_uq').on(t.contractorId, t.homeownerId),
  index('contacts_contractor_idx').on(t.contractorId),
  index('contacts_homeowner_idx').on(t.homeownerId),
])

// projects — one contractor's job workspace for a lead.
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  stage: projectStage('stage').notNull().default('new_lead'),
  estimateValue: decimal('estimate_value', { precision: 12, scale: 2 }),
  notes: text('notes'),
  followUpAt: timestamp('follow_up_at', { withTimezone: true }),
  stageUpdatedAt: timestamp('stage_updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('projects_contractor_idx').on(t.contractorId),
  index('projects_contact_idx').on(t.contactId),
  index('projects_lead_idx').on(t.leadId),
  index('projects_stage_idx').on(t.stage),
  index('projects_follow_up_idx').on(t.followUpAt),
])

// estimates — QUOTES. Homeowner acceptance is the "job won" signal.
export const estimates = pgTable('estimates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  serviceDetails: jsonb('service_details').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  laborCost: decimal('labor_cost', { precision: 12, scale: 2 }),
  materialsCost: decimal('materials_cost', { precision: 12, scale: 2 }),
  lineItems: jsonb('line_items').$type<Array<{ label: string; amount: string }>>().notNull().default(sql`'[]'::jsonb`),
  taxRate: decimal('tax_rate', { precision: 6, scale: 4 }),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }),
  total: decimal('total', { precision: 12, scale: 2 }),
  scopeNotes: text('scope_notes'),
  warranty: text('warranty'),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  pdfUrl: text('pdf_url'),
  status: estimateStatus('status').notNull().default('draft'),
  acceptToken: text('accept_token'),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedIp: text('accepted_ip'),
  acceptedUserAgent: text('accepted_user_agent'),
  acceptedSnapshot: jsonb('accepted_snapshot').$type<Record<string, unknown>>(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('estimates_project_idx').on(t.projectId),
  index('estimates_status_idx').on(t.status),
  uniqueIndex('estimates_accept_token_uq').on(t.acceptToken).where(sql`${t.acceptToken} is not null`),
])

// ============================================================
// MESSAGING (universal, polymorphic)
// ============================================================

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  type: conversationType('type').notNull().default('direct'),
  contextType: text('context_type'), // 'project' (the lead/job workspace) — null for direct chats
  contextId: uuid('context_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('conversations_context_idx').on(t.contextType, t.contextId),
])

// participant = a user (homeowner/admin/person) OR a contractor (whole company,
// any active member reads/sends).
export const conversationParticipants = pgTable('conversation_participants', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  participantType: participantType('participant_type').notNull(),
  participantId: uuid('participant_id').notNull(),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('conversation_participants_uq').on(t.conversationId, t.participantType, t.participantId),
  index('conversation_participants_lookup_idx').on(t.participantType, t.participantId),
])

// Structured payload attached to a message so the thread can render a rich card
// (e.g. a quote) instead of plain text. Nullable — most messages have no meta.
//
// A `quote` payload renders the inline accept/view card. An `event` payload is a
// lifecycle auto-message (quote accepted, job completed, …) that the thread
// renders as a normal LEFT/RIGHT bubble owned by the user who triggered it
// (`actorType`/`actorId`), with text PERSONALIZED per viewer at render time — so
// the contractor sees "Awaiting the homeowner…" while the homeowner sees
// "Awaiting you…". The stored `body` is only a fallback for non-thread surfaces.
export type SystemEventKind =
  | 'quote_accepted'
  | 'quote_superseded'
  | 'job_completed'

// One uploaded file shared in a chat message. We store the Cloudinary
// `secure_url` directly (not just the public_id) because non-image files are
// delivered from a different path (`/raw/upload/`) than images, and secure_url
// is already correct for either. `resourceType` drives the render (image thumb
// vs download chip).
export type ChatAttachment = {
  url: string
  publicId: string
  resourceType: 'image' | 'video' | 'raw'
  name: string
  bytes: number
  format: string | null
  width?: number
  height?: number
}

export type MessageMeta =
  | {
      kind: 'quote'
      estimateId: string
      total: string | null
      status: 'draft' | 'sent' | 'accepted' | 'rejected'
    }
  | {
      kind: 'event'
      event: SystemEventKind
      /** The participant who triggered this event (owns the bubble's side). */
      actorType: 'user' | 'contractor'
      actorId: string
    }
  | {
      // Inline "leave a review" prompt, posted when a job is completed. The
      // homeowner submits right in the thread; the card flips to submitted.
      kind: 'review'
      projectId: string
      contractorId: string
      status: 'pending' | 'submitted'
      rating?: number
    }
  | {
      // One or more files shared in the thread (images render as thumbnails,
      // everything else as a download chip). The message `body` holds the
      // optional caption (may be empty for a file-only message).
      kind: 'attachment'
      files: ChatAttachment[]
    }
  | {
      // A feature suggestion submitted from the "Suggest a feature" button, posted
      // into the user's Hommy Support thread and rendered as a styled card.
      kind: 'feature_request'
      subject: string
      details: string
    }

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: messageSenderType('sender_type').notNull(),
  senderId: uuid('sender_id'),
  body: text('body').notNull(),
  channel: messageChannel('channel').notNull().default('platform'),
  externalId: text('external_id'),
  meta: jsonb('meta').$type<MessageMeta>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('messages_conversation_created_idx').on(t.conversationId, t.createdAt),
])

// ============================================================
// REPUTATION, REVIEWS, ACTIVITY, NOTIFICATIONS
// ============================================================

// score_events — append-only; profile_score is the cached projection.
export const scoreEvents = pgTable('score_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  kind: scoreEventKind('kind').notNull(),
  delta: integer('delta').notNull(),
  sourceType: text('source_type'),
  sourceId: text('source_id'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('score_events_contractor_idx').on(t.contractorId),
])

// reviews — reviewer is a homeowner (now) or a contractor (c2c, future).
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  reviewerType: reviewerType('reviewer_type').notNull().default('homeowner'),
  reviewerId: uuid('reviewer_id').notNull(),
  rating: integer('rating'),
  comment: text('comment'),
  token: text('token').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('reviews_token_uq').on(t.token),
  index('reviews_contractor_idx').on(t.contractorId),
  index('reviews_project_idx').on(t.projectId),
])

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  actor: activityActor('actor').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('activity_log_project_idx').on(t.projectId),
])

// notifications — per USER (each member gets their own).
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  actionUrl: text('action_url'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  dedupKey: text('dedup_key'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  sentInApp: boolean('sent_in_app').notNull().default(false),
  sentEmail: boolean('sent_email').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('notifications_user_idx').on(t.userId),
  index('notifications_user_unread_idx').on(t.userId, t.isRead),
  uniqueIndex('notifications_user_dedup_uq').on(t.userId, t.dedupKey).where(sql`${t.dedupKey} is not null`),
])

// push_subscriptions — a user's Web Push endpoints (one row per browser/device).
// VAPID keys live in env; this stores the per-device subscription so a server
// job can push to every device. Stale endpoints (HTTP 410/404) are deleted on send.
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('push_subscriptions_user_endpoint_uq').on(t.userId, t.endpoint),
  index('push_subscriptions_user_idx').on(t.userId),
])

// ============================================================
// INTEGRATIONS — connected external accounts (provider-agnostic)
// ============================================================
// A company connects external accounts (Google now; OAuth providers such as the
// Business Profile API + social later). One row per connected external account
// (per Google place_id ⇒ multi-location = multiple rows). Imported data lands in
// external_reviews / external_media — the native `reviews` table stays untouched
// so win-based reputation (avg_rating/total_reviews) is never polluted. Token
// columns are nullable: unused by Places (API-key only), reserved for v2 OAuth.

export const integrationConnections = pgTable('integration_connections', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  // text, not an enum, so adding a provider needs no migration (like plans = data).
  provider: text('provider').notNull(), // 'google_places' | (later) 'google_business','instagram',…
  status: integrationStatus('status').notNull().default('active'),
  externalAccountId: text('external_account_id').notNull(), // Google place_id
  externalAccountLabel: text('external_account_label'), // business name shown in UI
  externalAccountMeta: jsonb('external_account_meta').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  // Reserved for v2 OAuth providers — unused by Places.
  scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
  accessTokenEnc: text('access_token_enc'),
  refreshTokenEnc: text('refresh_token_enc'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastError: text('last_error'),
  connectedBy: uuid('connected_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('integration_connections_company_provider_account_uq').on(t.contractorId, t.provider, t.externalAccountId),
  index('integration_connections_contractor_idx').on(t.contractorId),
])

// external_reviews — imported reviews (landing zone). Shown alongside native
// reviews on the profile, but kept separate from the `reviews` table.
export const externalReviews = pgTable('external_reviews', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  connectionId: uuid('connection_id').notNull().references(() => integrationConnections.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }), // denormalized for fast profile reads
  provider: text('provider').notNull(),
  externalId: text('external_id').notNull(), // Google review resource name (or content hash fallback)
  authorName: text('author_name'),
  authorPhotoUrl: text('author_photo_url'),
  rating: integer('rating'),
  comment: text('comment'),
  sourceUrl: text('source_url'), // link to the review/place on Google (attribution)
  postedAt: timestamp('posted_at', { withTimezone: true }),
  raw: jsonb('raw').$type<Record<string, unknown>>(),
  isVisible: boolean('is_visible').notNull().default(true),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('external_reviews_connection_external_uq').on(t.connectionId, t.externalId),
  index('external_reviews_contractor_idx').on(t.contractorId),
])

// external_media — imported photos (work images). v1 stores Google-hosted URLs
// directly; v2 may re-host to Cloudinary for durability.
export const externalMedia = pgTable('external_media', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  connectionId: uuid('connection_id').notNull().references(() => integrationConnections.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  externalId: text('external_id').notNull(), // Google photo resource name
  sourceUrl: text('source_url').notNull(), // Google-hosted image URL (photo.getURI)
  caption: text('caption'),
  widthPx: integer('width_px'),
  heightPx: integer('height_px'),
  attributionHtml: text('attribution_html'), // Places authorAttributions (must be displayed)
  raw: jsonb('raw').$type<Record<string, unknown>>(),
  isVisible: boolean('is_visible').notNull().default(true),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('external_media_connection_external_uq').on(t.connectionId, t.externalId),
  index('external_media_contractor_idx').on(t.contractorId),
])

// ============================================================
// ROOFING-ONLY MODULE — storm/weather (fenced; not core)
// ============================================================

export const stormEvents = pgTable('storm_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  eventType: stormEventType('event_type').notNull(),
  severity: text('severity'),
  affectedZipCodes: text('affected_zip_codes').array().notNull().default(sql`'{}'::text[]`),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  alertsSent: integer('alerts_sent').notNull().default(0),
  leadsGenerated: integer('leads_generated').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// WAITLIST — early-access email signups (service-neutral)
// Captured by the public AnnouncementBar; region/country are stamped from edge
// geo headers so we know where demand is.
// ============================================================

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull(),
  fullName: text('full_name'),
  zipCode: text('zip_code'),
  region: text('region'), // detected ISO 3166-2 subdivision, e.g. 'CA'
  country: text('country'), // detected ISO 3166-1 alpha-2, e.g. 'US'
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
  source: text('source'), // where the signup came from, e.g. 'coming_soon'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('waitlist_email_uq').on(t.email),
])

// guest_signup_attempts — a lightweight per-IP throttle for the frictionless
// guest-homeowner auto-signup (post-a-job / direct-request without an account).
// One row per attempt; count within a rolling window guards against mass
// account-squatting/spam without changing the legit one-click flow. Best-effort
// (fail-open): a throttle hiccup must never block a real homeowner.
export const guestSignupAttempts = pgTable('guest_signup_attempts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  ip: text('ip').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('guest_signup_attempts_ip_idx').on(t.ip, t.createdAt),
])

// consent_records — append-only proof of consent (cookies are handled client-side;
// this captures the legally-relevant grants: agreeing to Terms/Privacy, data
// sharing with matched pros, and the optional SMS opt-in). One row per granted/
// denied consent, stamped with the exact policy version + IP/UA so we can prove
// who agreed to what, when. Global/strictest standard (GDPR + TCPA).
export const consentRecords = pgTable('consent_records', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email'), // who, when there's no user row yet
  kind: text('kind').notNull(), // 'terms' | 'data_sharing' | 'sms' | 'marketing'
  granted: boolean('granted').notNull().default(true),
  policyVersion: text('policy_version'), // the wording/version they agreed to
  source: text('source'), // 'post_a_job' | 'direct_request' | 'contractor_signup' | ...
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('consent_records_user_idx').on(t.userId),
  index('consent_records_email_idx').on(t.email),
])

// feature_interest — a logged-in user's "notify me / upvote" on a roadmap
// feature shown on /contractor/coming-next. One row per (user, feature_key);
// count(*) per feature_key is the demand signal we use to prioritize the build
// order. feature_key is a stable slug owned by the app (see
// src/components/dashboard/coming-next/features.ts), not a FK.
export const featureInterest = pgTable('feature_interest', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  featureKey: text('feature_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('feature_interest_user_feature_uq').on(t.userId, t.featureKey),
])

// support_tickets — the per-user "Hommy Support" thread sidecar. The actual
// conversation lives on the messaging graph (conversations with contextType
// 'support'); this row carries the admin triage state (status/priority/assignee)
// for ONE ongoing thread per user. status/priority are free text validated in
// src/lib/support/constants.ts. See src/lib/actions/support.ts.
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requesterRole: text('requester_role').notNull(), // snapshot: 'contractor' | 'homeowner'
  ref: text('ref').notNull(), // human-friendly, e.g. 'HOM-7F3K2Q'
  // What the current/last request is about (feature_request | problem | billing |
  // other), chosen by the user when starting a request. Null until first chosen.
  category: text('category'),
  status: text('status').notNull().default('open'),
  priority: text('priority').notNull().default('normal'),
  assignedAdminId: uuid('assigned_admin_id').references(() => users.id, { onDelete: 'set null' }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('support_tickets_conversation_uq').on(t.conversationId),
  uniqueIndex('support_tickets_requester_uq').on(t.requesterId), // one ongoing thread per user
  uniqueIndex('support_tickets_ref_uq').on(t.ref),
  index('support_tickets_status_idx').on(t.status),
])

// ============================================================
// PLATFORM GEOGRAPHY — canonical states + cities (service-neutral)
// Drives SEO location pages (/roofing/[state]/[city]). A city page becomes
// indexable only when enough verified pros cover it (see src/lib/data/locations.ts);
// the canonical list here keeps URLs clean and stable regardless of supply.
// ============================================================

export const states = pgTable('states', {
  code: text('code').primaryKey(),            // ISO 3166-2 subdivision, e.g. 'TX'
  name: text('name').notNull(),               // 'Texas'
  slug: text('slug').notNull(),               // 'texas'
  isOperating: boolean('is_operating').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('states_slug_uq').on(t.slug),
])

export const cities = pgTable('cities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  stateCode: text('state_code').notNull().references(() => states.code, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),               // 'dallas'
  name: text('name').notNull(),               // 'Dallas'
  lat: doublePrecision('lat').notNull(),      // centroid → fed to findEligibleContractors
  lng: doublePrecision('lng').notNull(),
  population: integer('population'),
  intro: text('intro'),                       // optional editorial copy per city
  faq: jsonb('faq').$type<{ q: string; a: string }[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('cities_state_slug_uq').on(t.stateCode, t.slug),
  index('cities_state_idx').on(t.stateCode),
  index('cities_population_idx').on(t.population),
])

// ============================================================
// SMS OPT-OUTS — phones that texted STOP (compliance guard)
// Keyed by E.164 phone (STOP arrives by number, not by user). Checked before
// every SMS send so we never text an opted-out number. START removes the row.
// ============================================================

export const smsOptOuts = pgTable('sms_opt_outs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  phone: text('phone').notNull(), // E.164
  source: text('source'), // e.g. 'sms_stop'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('sms_opt_outs_phone_uq').on(t.phone),
])

// ============================================================
// EMAIL OPT-OUTS — addresses that unsubscribed / bounced / complained.
// Mirrors sms_opt_outs. The recruitment engine checks this before exporting any
// prospect to the cold-email tool, so we never re-contact a suppressed address.
// ============================================================

export const emailOptOuts = pgTable('email_opt_outs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull(), // always stored lowercased
  source: text('source'), // 'unsubscribe' | 'bounce' | 'complaint'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('email_opt_outs_email_uq').on(t.email),
])

// ============================================================
// CONTRACTOR PROSPECTS — the recruitment pipeline (service-neutral).
// Roofing companies we discovered (Google Places) and want to onboard into a
// service area with no supply. NOT contractors yet — no user/company row until
// they sign up via a claim link. The Python enrichment worker fills `email` +
// `email_confidence`; the cold-email tool sends; status syncs back here.
// See docs/launch-campaign.md and the recruitment-engine plan.
// ============================================================

export const contractorProspects = pgTable('contractor_prospects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
  companyName: text('company_name'),
  email: text('email'), // null until the enrichment worker finds one (lowercased)
  emailConfidence: integer('email_confidence'), // 0-100 from the verifier
  phone: text('phone'),
  website: text('website'),
  domain: text('domain'), // normalized host of `website` — Hunter lookup + dedupe
  city: text('city'),
  state: text('state'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  source: text('source').notNull().default('google_places'), // google_places | admin_csv | manual
  sourceRef: text('source_ref'), // Places place_id (dedupe key)
  rating: decimal('rating', { precision: 3, scale: 2 }),
  reviewCount: integer('review_count'),
  // discovered | enriching | email_found | email_verified | no_email | failed
  enrichmentStatus: text('enrichment_status').notNull().default('discovered'),
  // pending | exported | sent | opened | clicked | replied | bounced | suppressed | converted | skipped
  outreachStatus: text('outreach_status').notNull().default('pending'),
  // How many recruitment emails we've sent this prospect. Capped at
  // RECRUITMENT.MAX_OUTREACH_EMAILS so follow-ups (one per new job in their area)
  // stop after a few touches even if they never sign up.
  outreachCount: integer('outreach_count').notNull().default(0),
  lastOutreachAt: timestamp('last_outreach_at', { withTimezone: true }),
  inviteToken: text('invite_token'), // signed token used by the /claim link
  convertedToContractorId: uuid('converted_to_contractor_id').references((): AnyPgColumn => contractors.id, { onDelete: 'set null' }),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // One prospect per email (when found) and per Places listing.
  uniqueIndex('contractor_prospects_email_uq').on(t.email).where(sql`email is not null`),
  uniqueIndex('contractor_prospects_source_ref_uq').on(t.serviceId, t.sourceRef).where(sql`source_ref is not null`),
  index('contractor_prospects_domain_idx').on(t.domain),
  index('contractor_prospects_enrichment_idx').on(t.enrichmentStatus),
  index('contractor_prospects_outreach_idx').on(t.outreachStatus),
])

// prospect_enrichment_jobs — the queue the external Python worker drains to find
// a prospect's email (ScrapeGraphAI crawl → Hunter fill → verify). One live job
// per prospect; the worker claims rows with `FOR UPDATE SKIP LOCKED`.
export const prospectEnrichmentJobs = pgTable('prospect_enrichment_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  prospectId: uuid('prospect_id').notNull().references(() => contractorProspects.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('queued'), // queued | claimed | done | error
  attempts: integer('attempts').notNull().default(0),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  lockedBy: text('locked_by'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('prospect_enrichment_jobs_prospect_uq').on(t.prospectId),
  index('prospect_enrichment_jobs_status_idx').on(t.status),
])

// ============================================================
// RELATIONS (query-builder only — no DB constraints here)
// ============================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  memberships: many(contractorMembers),
  homeowner: one(homeowners, { fields: [users.id], references: [homeowners.userId] }),
  notifications: many(notifications),
}))

export const contractorsRelations = relations(contractors, ({ many }) => ({
  members: many(contractorMembers),
  serviceAreas: many(serviceAreas),
  contractorServices: many(contractorServices),
  contacts: many(contacts),
  projects: many(projects),
  leadRecipients: many(leadRecipients),
  subscriptions: many(subscriptions),
  creditTransactions: many(creditTransactions),
  scoreEvents: many(scoreEvents),
  reviews: many(reviews),
}))

export const contractorMembersRelations = relations(contractorMembers, ({ one }) => ({
  contractor: one(contractors, { fields: [contractorMembers.contractorId], references: [contractors.id] }),
  user: one(users, { fields: [contractorMembers.userId], references: [users.id] }),
}))

export const homeownersRelations = relations(homeowners, ({ one, many }) => ({
  user: one(users, { fields: [homeowners.userId], references: [users.id] }),
  leads: many(leads),
  contacts: many(contacts),
}))

export const servicesRelations = relations(services, ({ many }) => ({
  leads: many(leads),
  projects: many(projects),
  contractorServices: many(contractorServices),
}))

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  contractor: one(contractors, { fields: [subscriptions.contractorId], references: [contractors.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}))

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  contractor: one(contractors, { fields: [creditTransactions.contractorId], references: [contractors.id] }),
}))

export const serviceAreasRelations = relations(serviceAreas, ({ one }) => ({
  contractor: one(contractors, { fields: [serviceAreas.contractorId], references: [contractors.id] }),
}))

export const contractorServicesRelations = relations(contractorServices, ({ one }) => ({
  contractor: one(contractors, { fields: [contractorServices.contractorId], references: [contractors.id] }),
  service: one(services, { fields: [contractorServices.serviceId], references: [services.id] }),
}))

export const leadsRelations = relations(leads, ({ one, many }) => ({
  homeowner: one(homeowners, { fields: [leads.homeownerId], references: [homeowners.id] }),
  service: one(services, { fields: [leads.serviceId], references: [services.id] }),
  awardedContractor: one(contractors, { fields: [leads.awardedTo], references: [contractors.id] }),
  stormEvent: one(stormEvents, { fields: [leads.stormEventId], references: [stormEvents.id] }),
  recipients: many(leadRecipients),
}))

export const leadRecipientsRelations = relations(leadRecipients, ({ one }) => ({
  lead: one(leads, { fields: [leadRecipients.leadId], references: [leads.id] }),
  contractor: one(contractors, { fields: [leadRecipients.contractorId], references: [contractors.id] }),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  contractor: one(contractors, { fields: [contacts.contractorId], references: [contractors.id] }),
  homeowner: one(homeowners, { fields: [contacts.homeownerId], references: [homeowners.id] }),
  projects: many(projects),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  contractor: one(contractors, { fields: [projects.contractorId], references: [contractors.id] }),
  contact: one(contacts, { fields: [projects.contactId], references: [contacts.id] }),
  lead: one(leads, { fields: [projects.leadId], references: [leads.id] }),
  service: one(services, { fields: [projects.serviceId], references: [services.id] }),
  estimates: many(estimates),
  activity: many(activityLog),
  reviews: many(reviews),
}))

export const estimatesRelations = relations(estimates, ({ one }) => ({
  project: one(projects, { fields: [estimates.projectId], references: [projects.id] }),
}))

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}))

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, { fields: [conversationParticipants.conversationId], references: [conversations.id] }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}))

export const scoreEventsRelations = relations(scoreEvents, ({ one }) => ({
  contractor: one(contractors, { fields: [scoreEvents.contractorId], references: [contractors.id] }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  project: one(projects, { fields: [reviews.projectId], references: [projects.id] }),
  contractor: one(contractors, { fields: [reviews.contractorId], references: [contractors.id] }),
}))

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  project: one(projects, { fields: [activityLog.projectId], references: [projects.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}))

export const integrationConnectionsRelations = relations(integrationConnections, ({ one, many }) => ({
  contractor: one(contractors, { fields: [integrationConnections.contractorId], references: [contractors.id] }),
  reviews: many(externalReviews),
  media: many(externalMedia),
}))

export const externalReviewsRelations = relations(externalReviews, ({ one }) => ({
  connection: one(integrationConnections, { fields: [externalReviews.connectionId], references: [integrationConnections.id] }),
  contractor: one(contractors, { fields: [externalReviews.contractorId], references: [contractors.id] }),
}))

export const externalMediaRelations = relations(externalMedia, ({ one }) => ({
  connection: one(integrationConnections, { fields: [externalMedia.connectionId], references: [integrationConnections.id] }),
  contractor: one(contractors, { fields: [externalMedia.contractorId], references: [contractors.id] }),
}))
