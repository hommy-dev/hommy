import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

// Singleton prevents new pools on every HMR reload in development
const globalForDb = globalThis as unknown as {
  postgres: ReturnType<typeof postgres> | undefined
}

const client =
  globalForDb.postgres ??
  postgres(connectionString, {
    // REQUIRED for Supabase connection pooler (port 6543, Supavisor transaction mode).
    // PgBouncer transaction mode doesn't support named prepared statements — each
    // EXECUTE may land on a different backend connection than the PREPARE.
    prepare: false,

    // Allow genuine parallelism. Promise.all([q1, q2, q3]) needs 3 connections;
    // max:1 serializes everything silently, defeating all parallel optimizations.
    max: 10,

    // Fail fast on cold connections rather than blocking queries until they timeout.
    connect_timeout: 15,

    // Release idle connections so they don't hold Supavisor slots.
    idle_timeout: 30,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgres = client
}

export const db = drizzle(client)
