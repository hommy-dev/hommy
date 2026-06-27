// `verification-reminders` — daily cron. Nudges contractors who finished the
// matchable basics but never submitted their license + insurance, so they don't
// stall one step short of being able to win work.
//
// Cadence is a DECAYING schedule, not daily-forever: reminders fire at ~day 1,
// 3, 7, and 14 since signup, then stop. Each milestone sends at most once
// (notification dedupKey), and the whole thing stops the moment they submit
// documents or get verified/rejected (they fall out of the candidate set).

import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractors, contractorMembers } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { hasContractorInfo } from '@/lib/contractor/setup'

// Days since signup at which a reminder may fire. Four nudges, then silence.
const MILESTONES = [1, 3, 7, 14] as const
const DAY_MS = 24 * 60 * 60 * 1000

export const verificationReminders = inngest.createFunction(
  {
    id: 'verification-reminders',
    name: 'Verification document reminders',
    triggers: [{ cron: '0 16 * * *' }], // daily, 16:00 UTC
  },
  async () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - DAY_MS)

    // Still unverified (not verified, not rejected) with a document missing, and
    // old enough for the first nudge.
    const candidates = await db
      .select({
        id: contractors.id,
        companyName: contractors.companyName,
        createdAt: contractors.createdAt,
      })
      .from(contractors)
      .where(
        and(
          eq(contractors.verificationStatus, 'pending'),
          or(
            isNull(contractors.licenseDocUrl),
            isNull(contractors.insuranceDocUrl),
          ),
          lte(contractors.createdAt, oneDayAgo),
        ),
      )
      .limit(500)

    let sent = 0
    for (const c of candidates) {
      try {
        const days = Math.floor(
          (now.getTime() - new Date(c.createdAt).getTime()) / DAY_MS,
        )
        // The highest milestone reached. After day 14 this stays 14, and its
        // dedupKey blocks any further sends, so reminders stop on their own.
        const milestone = [...MILESTONES].reverse().find((m) => days >= m)
        if (!milestone) continue

        // Only nudge contractors who are actually matchable. Anyone missing the
        // basics gets the forced setup modal on the dashboard instead.
        if (!(await hasContractorInfo(c))) continue

        const members = await db
          .select({ userId: contractorMembers.userId })
          .from(contractorMembers)
          .where(
            and(
              eq(contractorMembers.contractorId, c.id),
              eq(contractorMembers.status, 'active'),
            ),
          )
        const userIds = [...new Set(members.map((m) => m.userId))]
        if (userIds.length === 0) continue

        await Promise.all(
          userIds.map((userId) =>
            sendNotification({
              userId,
              type: 'FOLLOW_UP',
              title: 'Verify your business to start winning jobs',
              body: "You're one step away. Upload your license and insurance, and you'll show up to homeowners and be able to win work.",
              actionUrl: '/contractor/settings/verification',
              sendEmail: true,
              sendPush: false,
              dedupKey: `verify_reminder:${c.id}:${milestone}`,
            }).catch((err) =>
              console.error('[verification-reminders] notify failed', {
                userId,
                err,
              }),
            ),
          ),
        )
        sent += 1
      } catch (err) {
        console.error('[verification-reminders] row failed', { id: c.id, err })
      }
    }

    return { ok: true, candidates: candidates.length, sent }
  },
)
