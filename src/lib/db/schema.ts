// ============================================================
// HOMEI — DRIZZLE ORM SCHEMA (v2)
// Database: PostgreSQL via Supabase
// ============================================================
// Canonical model: docs/HOMEI_PLATFORM.md.
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
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

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
  'ai_agent', 'marketing', 'refund', 'promo', 'expiry', 'adjustment',
])

export const leadUrgency = pgEnum('lead_urgency', ['emergency', 'within_week', 'within_month', 'planning'])
export const leadStatus = pgEnum('lead_status', ['open', 'filled', 'awarded', 'closed', 'expired'])
export const leadRecipientStatus = pgEnum('lead_recipient_status', [
  'offered', 'viewed', 'engaged', 'declined', 'expired', 'lost', 'won',
])
export const projectStage = pgEnum('project_stage', [
  'new_lead', 'contacted', 'estimate_sent', 'in_progress', 'completed', 'lost',
])
export const estimateStatus = pgEnum('estimate_status', ['draft', 'sent', 'accepted', 'rejected'])

export const conversationType = pgEnum('conversation_type', ['direct', 'lead', 'engagement', 'support'])
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

// ============================================================
// IDENTITY
// ============================================================

// users — extends Supabase auth.users (id = auth.users uuid). Three roles.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  phone: text('phone'),
  role: userRole('role').notNull(),
  // false for auto-created homeowners until they set a password (deferred-password flow)
  passwordSet: boolean('password_set').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// contractors — THE COMPANY. No user_id (membership is separate). Wallet +
// score are cached projections of the credit_transactions / score_events ledgers.
export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  companyName: text('company_name'),
  bio: text('bio'),
  logoUrl: text('logo_url'),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('contractors_verification_idx').on(t.verificationStatus),
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

// ============================================================
// SUPPLY-SIDE (company-scoped)
// ============================================================

export const serviceAreas = pgTable('service_areas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  zipCode: text('zip_code').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('service_areas_contractor_idx').on(t.contractorId),
  index('service_areas_zip_idx').on(t.zipCode),
  uniqueIndex('service_areas_contractor_zip_uq').on(t.contractorId, t.zipCode),
])

export const contractorServices = pgTable('contractor_services', {
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  subtypes: text('subtypes').array().notNull().default(sql`'{}'::text[]`),
}, (t) => [
  primaryKey({ columns: [t.contractorId, t.serviceId] }),
  index('contractor_services_service_idx').on(t.serviceId),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('leads_status_idx').on(t.status),
  index('leads_service_idx').on(t.serviceId),
  index('leads_homeowner_idx').on(t.homeownerId),
  index('leads_awarded_to_idx').on(t.awardedTo),
  index('leads_storm_event_idx').on(t.stormEventId),
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
  contextType: text('context_type'), // 'lead' | 'project' | 'engagement'
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

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: messageSenderType('sender_type').notNull(),
  senderId: uuid('sender_id'),
  body: text('body').notNull(),
  channel: messageChannel('channel').notNull().default('platform'),
  externalId: text('external_id'),
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
  sentInApp: boolean('sent_in_app').notNull().default(false),
  sentEmail: boolean('sent_email').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('notifications_user_idx').on(t.userId),
  index('notifications_user_unread_idx').on(t.userId, t.isRead),
  uniqueIndex('notifications_user_dedup_uq').on(t.userId, t.dedupKey).where(sql`${t.dedupKey} is not null`),
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
