/**
 * One-time backfill: mint a unique referral code for every contractor that
 * doesn't have one yet. Idempotent. Relative imports only (no "@/") so it runs
 * cleanly under tsx.
 *
 *   npx tsx scripts/backfill-referral-codes.ts
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { eq, isNull } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { contractors } from '../src/lib/db/schema'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomCode(len = 7): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

async function main() {
  const rows = await db.select({ id: contractors.id }).from(contractors).where(isNull(contractors.referralCode))
  let n = 0
  for (const r of rows) {
    let code: string | null = null
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = randomCode()
      const [taken] = await db
        .select({ id: contractors.id })
        .from(contractors)
        .where(eq(contractors.referralCode, candidate))
        .limit(1)
      if (!taken) { code = candidate; break }
    }
    if (!code) throw new Error('Could not generate a unique referral code')
    await db.update(contractors).set({ referralCode: code }).where(eq(contractors.id, r.id))
    n++
  }
  console.log(`Backfilled referral codes for ${n} contractors.`)
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
