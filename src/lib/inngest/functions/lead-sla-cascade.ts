// `lead/recipient.sla` — housekeeping cron (every 15 min). Leads do NOT expire on
// contractors anymore (broad fan-out + homeowner control replaced that). This job
// only does two gentle things:
//   1. Quote reminder — nudge an engaged pro who hasn't quoted yet (no penalty).
//   2. Abandoned-post cleanup — auto-close a job left totally untouched (no
//      engagement) for ABANDONED_LEAD_DAYS, so the board doesn't fill with zombies.

import { and, eq, inArray, isNotNull, lt, notInArray } from 'drizzle-orm'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorMembers, estimates, leadRecipients, leads, projects } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { ABANDONED_LEAD_DAYS } from '@/lib/config/tunables'

export const leadSlaCascade = inngest.createFunction(
  {
    id: 'lead-sla-cascade',
    name: 'Lead housekeeping — quote reminders + abandoned cleanup',
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async () => {
    const now = new Date()

    // ── 1. Quote reminders ────────────────────────────────────────────────────
    // Engaged pros whose reminder time has passed and who haven't quoted yet get
    // ONE friendly nudge (no score change). slaDeadline is cleared so it's
    // at-most-once. Skip if the lead's already awarded/closed.
    const dueReminders = await db
      .select({ id: leadRecipients.id, contractorId: leadRecipients.contractorId, leadId: leadRecipients.leadId })
      .from(leadRecipients)
      .innerJoin(leads, eq(leads.id, leadRecipients.leadId))
      .where(
        and(
          eq(leadRecipients.status, 'engaged'),
          isNotNull(leadRecipients.slaDeadline),
          lt(leadRecipients.slaDeadline, now),
          eq(leads.status, 'open'),
        ),
      )
      .limit(100)

    let reminded = 0
    for (const r of dueReminders) {
      try {
        // Claim it (clear the reminder timestamp) so we only nudge once.
        const cleared = await db
          .update(leadRecipients)
          .set({ slaDeadline: null })
          .where(and(eq(leadRecipients.id, r.id), isNotNull(leadRecipients.slaDeadline)))
          .returning({ id: leadRecipients.id })
        if (cleared.length === 0) continue

        // Already quoted? Then no nudge needed.
        const quoted = await db
          .select({ id: estimates.id })
          .from(estimates)
          .innerJoin(projects, eq(projects.id, estimates.projectId))
          .where(
            and(
              eq(projects.leadId, r.leadId),
              eq(projects.contractorId, r.contractorId),
              inArray(estimates.status, ['sent', 'accepted']),
            ),
          )
          .limit(1)
        if (quoted.length > 0) continue

        // Nudge every active member of the company.
        const members = await db
          .select({ userId: contractorMembers.userId })
          .from(contractorMembers)
          .where(and(eq(contractorMembers.contractorId, r.contractorId), eq(contractorMembers.status, 'active')))
        await Promise.all(
          [...new Set(members.map((m) => m.userId))].map((userId) =>
            sendNotification({
              userId,
              type: 'FOLLOW_UP',
              title: 'Send your quote to win the job',
              body: 'You started a chat but haven’t sent a quote yet. Homeowners hire fastest when a quote is in.',
              actionUrl: '/contractor/messages',
              entityType: 'LEAD',
              entityId: r.leadId,
              sendEmail: false,
              dedupKey: `quote_reminder:${r.leadId}:${r.contractorId}`,
            }).catch((err) => console.error('[lead-sla] reminder notify', { userId, err })),
          ),
        )
        reminded += 1
      } catch (err) {
        console.error('[lead-sla] reminder row failed', { id: r.id, err })
      }
    }

    // ── 2. Abandoned-post cleanup ─────────────────────────────────────────────
    // Open jobs older than the TTL with ZERO engagement are auto-closed. This is
    // post hygiene, never a contractor penalty.
    const cutoff = new Date(now.getTime() - ABANDONED_LEAD_DAYS * 24 * 60 * 60 * 1000)
    const oldOpen = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.status, 'open'),
          lt(leads.createdAt, cutoff),
          // Never auto-expire awaiting-coverage leads — the homeowner is waiting
          // on supply we're recruiting, not abandoning the post.
          eq(leads.awaitingCoverage, false),
        ),
      )
      .limit(100)

    let closed = 0
    if (oldOpen.length > 0) {
      const candidateIds = oldOpen.map((l) => l.id)
      const engagedRows = await db
        .selectDistinct({ leadId: leadRecipients.leadId })
        .from(leadRecipients)
        .where(and(inArray(leadRecipients.leadId, candidateIds), inArray(leadRecipients.status, ['engaged', 'won'])))
      const engaged = new Set(engagedRows.map((e) => e.leadId))
      const abandoned = candidateIds.filter((id) => !engaged.has(id))

      for (const leadId of abandoned) {
        try {
          await db.transaction(async (tx) => {
            const updated = await tx
              .update(leads)
              .set({ status: 'expired', closedAt: now })
              .where(and(eq(leads.id, leadId), eq(leads.status, 'open')))
              .returning({ id: leads.id })
            if (updated.length === 0) return
            await tx
              .update(leadRecipients)
              .set({ status: 'expired', respondedAt: now })
              .where(and(eq(leadRecipients.leadId, leadId), notInArray(leadRecipients.status, ['won'])))
          })
          closed += 1
        } catch (err) {
          console.error('[lead-sla] abandoned close failed', { leadId, err })
        }
      }
    }

    return { ok: true, reminded, closed }
  },
)
