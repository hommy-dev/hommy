// ============================================================
// HOMEI — DRIZZLE ORM SCHEMA
// Database: PostgreSQL via Supabase
// ORM: Drizzle ORM (drizzle-orm + drizzle-kit)
// ============================================================
// MULTI-VERTICAL (see docs/HOMEI_PLATFORM.md §0): Homei is a home-services
// platform; roofing is launch vertical #1. Names here are service-neutral —
// no `roof`/`roofing` in tables/columns. leads / projects / contractor_services
// reference a `service_id`; vertical-specific fields live in `service_details`
// (jsonb). storm_events is a roofing-only, fenced module (leads.storm_event_id
// is nullable and only set for roofing).
//
// CONVENTIONS:
// - All IDs are UUIDs via gen_random_uuid() (built into Postgres 13+)
// - Money fields use decimal(...) — returned as strings; parse with parseFloat()
//   for display only (see AGENTS.md)
// - All timestamps use { withTimezone: true }
// - Enums are snake_case Postgres enums; cross-cutting/growing fields
//   (notification type) stay text for flexibility
// - Relations section is separate — for the query builder only, not DB
//   constraints (those come from .references())
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

export const userRole = pgEnum('user_role', ['contractor', 'admin'])

export const verificationStatus = pgEnum('verification_status', [
  'pending',
  'verified',
  'rejected',
])

export const contractorPlan = pgEnum('contractor_plan', [
  'starter',
  'growth',
  'pro',
])

export const leadUrgency = pgEnum('lead_urgency', [
  'emergency',
  'within_week',
  'within_month',
  'planning',
])

export const leadStatus = pgEnum('lead_status', [
  'pending',
  'assigned',
  'expired',
])

export const projectStage = pgEnum('project_stage', [
  'new_lead',
  'contacted',
  'estimate_sent',
  'in_progress',
  'completed',
  'lost',
])

export const estimateStatus = pgEnum('estimate_status', [
  'draft',
  'sent',
  'accepted',
  'rejected',
])

export const messageDirection = pgEnum('message_direction', [
  'outbound',
  'inbound',
])

export const messageChannel = pgEnum('message_channel', [
  'sms',
  'email',
  'platform',
])

export const activityActor = pgEnum('activity_actor', [
  'system',
  'contractor',
  'homeowner',
])

export const stormEventType = pgEnum('storm_event_type', [
  'hail',
  'high_wind',
  'storm',
])

// ============================================================
// CORE / IDENTITY
// ============================================================

// users — extends Supabase auth.users. id is the auth.users uuid (no default).
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  phone: text('phone'),
  role: userRole('role').notNull().default('contractor'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// services — the verticals. Roofing is a seed row; new home services are new
// rows here, NOT migrations. subtypes is the service-defined option list.
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
// CONTRACTOR (supply side)
// ============================================================

export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: contractorPlan('plan'),
  leadsUsedThisMonth: integer('leads_used_this_month').notNull().default(0),
  avgResponseTimeMinutes: integer('avg_response_time_minutes'),
  avgRating: decimal('avg_rating', { precision: 3, scale: 2 }),
  totalReviews: integer('total_reviews').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('contractors_user_uq').on(t.userId),
  index('contractors_verification_idx').on(t.verificationStatus),
  index('contractors_plan_idx').on(t.plan),
])

// service_areas — many zip codes per contractor (centroid lat/lng for NWS)
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

// contractor_services — which verticals (+ subtypes) a contractor handles.
// Replaces the roofing-only job_type enum. Composite PK.
export const contractorServices = pgTable('contractor_services', {
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  subtypes: text('subtypes').array().notNull().default(sql`'{}'::text[]`),
}, (t) => [
  primaryKey({ columns: [t.contractorId, t.serviceId] }),
  index('contractor_services_service_idx').on(t.serviceId),
])

// ============================================================
// HOMEOWNER (demand side — UNAUTHENTICATED, no account)
// ============================================================

export const homeowners = pgTable('homeowners', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  fullName: text('full_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  zipCode: text('zip_code'),
  city: text('city'),
  state: text('state'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('homeowners_phone_idx').on(t.phone),
  index('homeowners_email_idx').on(t.email),
  index('homeowners_zip_idx').on(t.zipCode),
])

// ============================================================
// LEADS → CONTACTS → PROJECTS → ESTIMATES
// ============================================================

// leads — the raw incoming request. service_details holds vertical-specific
// intake (e.g. roofing: { subtype: 'storm_damage' }). storm_event_id is
// roofing-only and null for other verticals.
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: uuid('homeowner_id').notNull().references(() => homeowners.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  serviceDetails: jsonb('service_details').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  urgency: leadUrgency('urgency').notNull().default('planning'),
  photoUrl: text('photo_url'),
  notes: text('notes'),
  stormEventId: uuid('storm_event_id').references(() => stormEvents.id, { onDelete: 'set null' }),
  status: leadStatus('status').notNull().default('pending'),
  assignedTo: uuid('assigned_to').references(() => contractors.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('leads_status_idx').on(t.status),
  index('leads_assigned_to_idx').on(t.assignedTo),
  index('leads_service_idx').on(t.serviceId),
  index('leads_homeowner_idx').on(t.homeownerId),
  index('leads_storm_event_idx').on(t.stormEventId),
])

// contacts — a contractor's long-term record of a homeowner (one per pair)
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

// projects — a single job in the pipeline. service_id inherited from the lead.
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
  index('projects_stage_idx').on(t.stage),
  index('projects_follow_up_idx').on(t.followUpAt),
])

// estimates — service_details holds vertical-specific fields (roofing: roof
// size, measurement_source, materials). Acceptance is a tokenized link with an
// ESIGN/UETA audit trail (no separate e-sign service for the MVP).
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
// COMMUNICATION / ACTIVITY
// ============================================================

// messages — unified store. Homeowner has no account: outbound = SMS/email,
// inbound arrives via Twilio/Resend webhooks matched to a contact. The
// contractor "Messages" inbox is their view of these threads.
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  direction: messageDirection('direction').notNull(),
  channel: messageChannel('channel').notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  externalId: text('external_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('messages_contact_idx').on(t.contactId),
  index('messages_project_idx').on(t.projectId),
  index('messages_contractor_created_idx').on(t.contractorId, t.createdAt),
])

// activity_log — auto-generated project timeline
export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  actor: activityActor('actor').notNull(),
  action: text('action').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('activity_log_project_idx').on(t.projectId),
])

// reviews — collected from completed projects via tokenized homeowner link
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  homeownerId: uuid('homeowner_id').notNull().references(() => homeowners.id, { onDelete: 'cascade' }),
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
// NOTIFICATIONS
// Shape matches the sendNotification() transport core in
// src/lib/notifications/index.ts. `type`/`entityType` are text (cross-cutting,
// grows per feature/vertical). dedupKey backs an idempotency partial-unique
// index on (user_id, dedup_key).
// ============================================================

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
// RELATIONS (query-builder only — no DB constraints here)
// ============================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  contractor: one(contractors, {
    fields: [users.id],
    references: [contractors.userId],
  }),
  notifications: many(notifications),
}))

export const servicesRelations = relations(services, ({ many }) => ({
  leads: many(leads),
  projects: many(projects),
  contractorServices: many(contractorServices),
}))

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
  user: one(users, { fields: [contractors.userId], references: [users.id] }),
  serviceAreas: many(serviceAreas),
  contractorServices: many(contractorServices),
  contacts: many(contacts),
  projects: many(projects),
  assignedLeads: many(leads),
  reviews: many(reviews),
}))

export const serviceAreasRelations = relations(serviceAreas, ({ one }) => ({
  contractor: one(contractors, {
    fields: [serviceAreas.contractorId],
    references: [contractors.id],
  }),
}))

export const contractorServicesRelations = relations(contractorServices, ({ one }) => ({
  contractor: one(contractors, {
    fields: [contractorServices.contractorId],
    references: [contractors.id],
  }),
  service: one(services, {
    fields: [contractorServices.serviceId],
    references: [services.id],
  }),
}))

export const homeownersRelations = relations(homeowners, ({ many }) => ({
  leads: many(leads),
  contacts: many(contacts),
}))

export const leadsRelations = relations(leads, ({ one }) => ({
  homeowner: one(homeowners, { fields: [leads.homeownerId], references: [homeowners.id] }),
  service: one(services, { fields: [leads.serviceId], references: [services.id] }),
  assignedContractor: one(contractors, { fields: [leads.assignedTo], references: [contractors.id] }),
  stormEvent: one(stormEvents, { fields: [leads.stormEventId], references: [stormEvents.id] }),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  contractor: one(contractors, { fields: [contacts.contractorId], references: [contractors.id] }),
  homeowner: one(homeowners, { fields: [contacts.homeownerId], references: [homeowners.id] }),
  projects: many(projects),
  messages: many(messages),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  contractor: one(contractors, { fields: [projects.contractorId], references: [contractors.id] }),
  contact: one(contacts, { fields: [projects.contactId], references: [contacts.id] }),
  lead: one(leads, { fields: [projects.leadId], references: [leads.id] }),
  service: one(services, { fields: [projects.serviceId], references: [services.id] }),
  estimates: many(estimates),
  messages: many(messages),
  activity: many(activityLog),
  reviews: many(reviews),
}))

export const estimatesRelations = relations(estimates, ({ one }) => ({
  project: one(projects, { fields: [estimates.projectId], references: [projects.id] }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, { fields: [messages.projectId], references: [projects.id] }),
  contact: one(contacts, { fields: [messages.contactId], references: [contacts.id] }),
  contractor: one(contractors, { fields: [messages.contractorId], references: [contractors.id] }),
}))

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  project: one(projects, { fields: [activityLog.projectId], references: [projects.id] }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  project: one(projects, { fields: [reviews.projectId], references: [projects.id] }),
  contractor: one(contractors, { fields: [reviews.contractorId], references: [contractors.id] }),
  homeowner: one(homeowners, { fields: [reviews.homeownerId], references: [homeowners.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}))
