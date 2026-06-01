// ============================================================
// HOMEI — DRIZZLE ORM SCHEMA
// Database: PostgreSQL via Supabase
// ORM: Drizzle ORM (drizzle-orm + drizzle-kit)
// ============================================================
// TODO: Build the Homei schema per docs/HOMEI_PLATFORM.md §7.
// Tables: users, services, contractors, service_areas, contractor_services,
//   homeowners, leads, contacts, projects, estimates, messages,
//   activity_log, reviews, storm_events, notifications.
//
// MULTI-VERTICAL (see HOMEI_PLATFORM.md §0): Homei is a home-services platform,
// roofing is just vertical #1. Keep names service-neutral — NO `roof`/`roofing`
// in table/column names. leads/projects/contractor_services reference a
// `service_id`; vertical-specific fields live in `service_details` (jsonb).
// storm_events is a roofing-only, fenced module (nullable leads.storm_event_id).
//
// CONVENTIONS (carried over from the previous build):
// - All IDs are UUIDs via gen_random_uuid() (pgcrypto)
// - All money fields use decimal(10,2) — never number/float
// - All timestamps use { withTimezone: true }
// - Relations section is separate (query-builder only)
// - Indexes / unique constraints in table config callbacks
// ============================================================

export {}
