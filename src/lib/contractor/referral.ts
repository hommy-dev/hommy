// Referral program helpers — shareable codes + referrer resolution.
//
// Each company gets a unique `referralCode` (minted at provisioning). A new
// company that signs up via /auth/signup/contractor?ref=CODE stores the referrer
// on `referredByContractorId`. Both companies are credited REFERRAL_CREDITS when
// the referred company is ADMIN-VERIFIED (see decideVerification) — the fraud
// gate — expiring REFERRAL_EXPIRES_MONTHS out. Mirrors the slug helper's
// collision-retry shape.

import { randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, creditTransactions } from '@/lib/db/schema'

/** Credits each side receives on a successful (verified) referral. */
export const REFERRAL_CREDITS = 25
/** Referral credits expire this many months after grant (like the launch promo). */
export const REFERRAL_EXPIRES_MONTHS = 4

// Accept the base client or an open transaction (so it runs inside provisioning's txn).
type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// Unambiguous base32 (no 0/O/1/I) so codes are easy to read/share aloud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(len = 7): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

/** Mint a unique referral code if the company doesn't have one yet; returns it. */
export async function assignReferralCodeIfMissing(
  ex: DbExecutor,
  contractorId: string,
): Promise<string> {
  const [row] = await ex
    .select({ code: contractors.referralCode })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)
  if (row?.code) return row.code

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode()
    const [taken] = await ex
      .select({ id: contractors.id })
      .from(contractors)
      .where(eq(contractors.referralCode, code))
      .limit(1)
    if (taken) continue
    await ex.update(contractors).set({ referralCode: code }).where(eq(contractors.id, contractorId))
    return code
  }
  throw new Error('Could not generate a unique referral code')
}

/** Resolve a referral code to the referring company id, or null if unknown. */
export async function resolveReferrer(
  ex: DbExecutor,
  code: string | null | undefined,
): Promise<string | null> {
  const normalized = (code ?? '').trim().toUpperCase()
  if (!normalized) return null
  const [row] = await ex
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.referralCode, normalized))
    .limit(1)
  return row?.id ?? null
}

/** Referral stats for the "refer a roofer" dashboard card. */
export async function getReferralStats(
  contractorId: string,
): Promise<{ referred: number; rewarded: number; earned: number }> {
  const [refs] = await db
    .select({
      referred: sql<number>`count(*)::int`,
      rewarded: sql<number>`(count(*) filter (where ${contractors.referralRewardedAt} is not null))::int`,
    })
    .from(contractors)
    .where(eq(contractors.referredByContractorId, contractorId))

  const [earn] = await db
    .select({ earned: sql<number>`coalesce(sum(${creditTransactions.amount}), 0)::int` })
    .from(creditTransactions)
    .where(and(eq(creditTransactions.contractorId, contractorId), eq(creditTransactions.kind, 'referral')))

  return { referred: refs?.referred ?? 0, rewarded: refs?.rewarded ?? 0, earned: earn?.earned ?? 0 }
}
