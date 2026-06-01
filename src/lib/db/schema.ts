// ============================================================
// ROOFLINK — DRIZZLE ORM SCHEMA
// Database: PostgreSQL via Supabase
// ORM: Drizzle ORM (drizzle-orm + drizzle-kit)
// ============================================================
// TODO: Build the RoofLink schema per docs/ROOFING_PLATFORM.md §7.
// Tables: users, contractors, service_areas, contractor_job_types,
//   homeowners, leads, contacts, projects, estimates, messages,
//   activity_log, reviews, storm_events, notifications.
//
// CONVENTIONS (carried over from the previous build):
// - All IDs are UUIDs via gen_random_uuid() (pgcrypto)
// - All money fields use decimal(10,2) — never number/float
// - All timestamps use { withTimezone: true }
// - Relations section is separate (query-builder only)
// - Indexes / unique constraints in table config callbacks
// ============================================================

export {}
