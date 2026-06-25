'use server'

// Team management for a contractor company: invite teammates (tokenized link +
// email), manage roles, remove members, and accept invitations. Owner/admin
// only for management; the last owner is protected. Phase 1 keeps one active
// membership per user. New-user signup-on-accept lands in a follow-up — accept
// here handles an authenticated, membership-less contractor user.

import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser, getMembershipRole } from '@/lib/data/dashboard'
import { getTeam } from '@/lib/data/team'
import { sendEmail } from '@/lib/notifications/email'
import { renderEmail } from '@/lib/notifications/email/template'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  contractorMembers,
  contractorInvitations,
  contractors,
  users,
} from '@/lib/db/schema'

type FieldErrors = Record<string, string>
type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: FieldErrors }

const INVITE_TTL_DAYS = 7

function appOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (site) return site
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

async function requireTeamManager(): Promise<
  | { ok: true; contractorId: string; userId: string; role: 'owner' | 'admin' }
  | { ok: false; error: string }
> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { ok: false, error: 'No company found for your account.' }
  const role = await getMembershipRole(user.id, contractor.id)
  if (role !== 'owner' && role !== 'admin') {
    return { ok: false, error: 'Only owners and admins can manage the team.' }
  }
  return { ok: true, contractorId: contractor.id, userId: user.id, role }
}

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: z.enum(['admin', 'member']),
})

export async function inviteMember(input: unknown): Promise<Result<{ token: string }>> {
  const ctx = await requireTeamManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = InviteSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Check the details.'
    return { success: false, error: msg, fieldErrors: { email: msg } }
  }
  const { email, role } = parsed.data

  // Admins manage members only — only owners can add admins.
  if (ctx.role === 'admin' && role === 'admin') {
    return { success: false, error: 'Admins can only invite members.', fieldErrors: { email: 'Owners only' } }
  }

  // Seat cap: active members + pending invites must stay under the plan max.
  const team = await getTeam(ctx.contractorId)
  if (team.seats.used >= team.seats.max) {
    return {
      success: false,
      error: `Your ${team.seats.planName} plan includes ${team.seats.max} seat${team.seats.max === 1 ? "" : "s"}. Upgrade to add more.`,
    }
  }

  // Already an active member?
  const existingMember = await db
    .select({ id: contractorMembers.id })
    .from(contractorMembers)
    .innerJoin(users, eq(users.id, contractorMembers.userId))
    .where(
      and(
        eq(contractorMembers.contractorId, ctx.contractorId),
        eq(contractorMembers.status, 'active'),
        sql`lower(${users.email}) = ${email}`,
      ),
    )
    .limit(1)
  if (existingMember.length > 0) {
    return { success: false, error: 'That person is already on your team.', fieldErrors: { email: 'Already a member' } }
  }

  // Already invited (pending)?
  const existingInvite = await db
    .select({ id: contractorInvitations.id })
    .from(contractorInvitations)
    .where(
      and(
        eq(contractorInvitations.contractorId, ctx.contractorId),
        sql`lower(${contractorInvitations.email}) = ${email}`,
        isNull(contractorInvitations.acceptedAt),
      ),
    )
    .limit(1)
  if (existingInvite.length > 0) {
    return { success: false, error: 'There’s already a pending invite for that email.', fieldErrors: { email: 'Already invited' } }
  }

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(contractorInvitations).values({
    contractorId: ctx.contractorId,
    email,
    role,
    token,
    invitedBy: ctx.userId,
    expiresAt,
  })

  // Best-effort email — the inviter can also copy the link from the UI.
  const [company] = await db
    .select({ name: contractors.companyName })
    .from(contractors)
    .where(eq(contractors.id, ctx.contractorId))
    .limit(1)
  const link = `${appOrigin()}/invite/${token}`
  const companyName = company?.name ?? 'a company'
  await sendEmail(
    email,
    `You're invited to join ${companyName} on Hommy`,
    renderEmail({
      preheader: `Join ${companyName} on Hommy as ${role}.`,
      heading: `You're invited to join ${companyName}`,
      intro: `You've been invited to join <strong>${companyName}</strong> on Hommy as <strong>${role}</strong>.`,
      cta: { label: 'Accept the invitation', url: link },
      note: `This invitation expires in ${INVITE_TTL_DAYS} days. If the button doesn't work, paste this link into your browser: ${link}`,
    }),
  ).catch(() => undefined)

  revalidatePath('/contractor/settings/team')
  return { success: true, data: { token } }
}

export async function cancelInvitation(id: string): Promise<Result> {
  const ctx = await requireTeamManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof id !== 'string' || !id) return { success: false, error: 'Invalid invite.' }

  await db
    .delete(contractorInvitations)
    .where(
      and(
        eq(contractorInvitations.id, id),
        eq(contractorInvitations.contractorId, ctx.contractorId),
      ),
    )
  revalidatePath('/contractor/settings/team')
  return { success: true }
}

/** Re-send a pending invite: extend its expiry and email the link again. */
export async function resendInvitation(id: string): Promise<Result<{ token: string }>> {
  const ctx = await requireTeamManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof id !== 'string' || !id) return { success: false, error: 'Invalid invite.' }

  const [inv] = await db
    .select({
      email: contractorInvitations.email,
      role: contractorInvitations.role,
      token: contractorInvitations.token,
      acceptedAt: contractorInvitations.acceptedAt,
    })
    .from(contractorInvitations)
    .where(
      and(
        eq(contractorInvitations.id, id),
        eq(contractorInvitations.contractorId, ctx.contractorId),
      ),
    )
    .limit(1)
  if (!inv || inv.acceptedAt) {
    return { success: false, error: 'That invite is no longer pending.' }
  }
  if (ctx.role === 'admin' && inv.role === 'admin') {
    return { success: false, error: 'Admins can only manage member invites.' }
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db
    .update(contractorInvitations)
    .set({ expiresAt })
    .where(eq(contractorInvitations.id, id))

  const [company] = await db
    .select({ name: contractors.companyName })
    .from(contractors)
    .where(eq(contractors.id, ctx.contractorId))
    .limit(1)
  const link = `${appOrigin()}/invite/${inv.token}`
  const companyName = company?.name ?? 'a company'
  await sendEmail(
    inv.email,
    `Reminder: join ${companyName} on Hommy`,
    renderEmail({
      preheader: `Join ${companyName} on Hommy as ${inv.role}.`,
      heading: `Reminder: join ${companyName}`,
      intro: `You've been invited to join <strong>${companyName}</strong> on Hommy as <strong>${inv.role}</strong>.`,
      cta: { label: 'Accept the invitation', url: link },
      note: `This invitation expires in ${INVITE_TTL_DAYS} days. If the button doesn't work, paste this link into your browser: ${link}`,
    }),
  ).catch(() => undefined)

  revalidatePath('/contractor/settings/team')
  return { success: true, data: { token: inv.token } }
}

const RoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member']),
})

export async function changeMemberRole(input: unknown): Promise<Result> {
  const ctx = await requireTeamManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = RoleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid request.' }
  const { userId: targetUserId, role: newRole } = parsed.data

  if (targetUserId === ctx.userId) {
    return { success: false, error: 'You can’t change your own role.' }
  }

  const [target] = await db
    .select({ role: contractorMembers.role })
    .from(contractorMembers)
    .where(
      and(
        eq(contractorMembers.contractorId, ctx.contractorId),
        eq(contractorMembers.userId, targetUserId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .limit(1)
  if (!target) return { success: false, error: 'That member no longer exists.' }

  // Admins manage members only — they can't change another admin/owner, nor
  // promote anyone above member. Owners do all role changes.
  if (ctx.role === 'admin' && (target.role !== 'member' || newRole !== 'member')) {
    return { success: false, error: 'Admins can only manage members.' }
  }

  // Only an owner can grant or modify the owner role.
  if ((newRole === 'owner' || target.role === 'owner') && ctx.role !== 'owner') {
    return { success: false, error: 'Only an owner can manage owners.' }
  }

  // Demoting an owner: lock the owner rows and re-check inside the txn so two
  // concurrent demotions can't drop the company to zero owners.
  try {
    await db.transaction(async (tx) => {
      if (target.role === 'owner' && newRole !== 'owner') {
        const owners = await tx
          .select({ id: contractorMembers.id })
          .from(contractorMembers)
          .where(
            and(
              eq(contractorMembers.contractorId, ctx.contractorId),
              eq(contractorMembers.status, 'active'),
              eq(contractorMembers.role, 'owner'),
            ),
          )
          .for('update')
        if (owners.length <= 1) throw new Error('LAST_OWNER')
      }
      await tx
        .update(contractorMembers)
        .set({ role: newRole })
        .where(
          and(
            eq(contractorMembers.contractorId, ctx.contractorId),
            eq(contractorMembers.userId, targetUserId),
          ),
        )
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'LAST_OWNER') {
      return { success: false, error: 'You need at least one owner. Promote someone first.' }
    }
    throw e
  }

  revalidatePath('/contractor/settings/team')
  return { success: true }
}

export async function removeMember(targetUserId: string): Promise<Result> {
  const ctx = await requireTeamManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof targetUserId !== 'string' || !targetUserId) {
    return { success: false, error: 'Invalid member.' }
  }
  if (targetUserId === ctx.userId) {
    return { success: false, error: 'You can’t remove yourself.' }
  }

  const [target] = await db
    .select({ role: contractorMembers.role })
    .from(contractorMembers)
    .where(
      and(
        eq(contractorMembers.contractorId, ctx.contractorId),
        eq(contractorMembers.userId, targetUserId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .limit(1)
  if (!target) return { success: false, error: 'That member no longer exists.' }

  // Admins manage members only.
  if (ctx.role === 'admin' && target.role !== 'member') {
    return { success: false, error: 'Admins can only remove members.' }
  }

  if (target.role === 'owner' && ctx.role !== 'owner') {
    return { success: false, error: 'Only an owner can remove an owner.' }
  }

  try {
    await db.transaction(async (tx) => {
      if (target.role === 'owner') {
        const owners = await tx
          .select({ id: contractorMembers.id })
          .from(contractorMembers)
          .where(
            and(
              eq(contractorMembers.contractorId, ctx.contractorId),
              eq(contractorMembers.status, 'active'),
              eq(contractorMembers.role, 'owner'),
            ),
          )
          .for('update')
        if (owners.length <= 1) throw new Error('LAST_OWNER')
      }
      await tx
        .delete(contractorMembers)
        .where(
          and(
            eq(contractorMembers.contractorId, ctx.contractorId),
            eq(contractorMembers.userId, targetUserId),
          ),
        )
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'LAST_OWNER') {
      return { success: false, error: 'You can’t remove the last owner.' }
    }
    throw e
  }

  revalidatePath('/contractor/settings/team')
  return { success: true }
}

/** Leave the company you're currently in (self-remove). The last owner must
 * transfer ownership first. Clears/repoints the active workspace. */
export async function leaveCompany(): Promise<Result> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { success: false, error: 'You’re not in a company.' }

  try {
    await db.transaction(async (tx) => {
      const [me] = await tx
        .select({ role: contractorMembers.role })
        .from(contractorMembers)
        .where(
          and(
            eq(contractorMembers.contractorId, contractor.id),
            eq(contractorMembers.userId, user.id),
            eq(contractorMembers.status, 'active'),
          ),
        )
        .for('update')
      if (!me) throw new Error('NOT_MEMBER')

      if (me.role === 'owner') {
        const owners = await tx
          .select({ id: contractorMembers.id })
          .from(contractorMembers)
          .where(
            and(
              eq(contractorMembers.contractorId, contractor.id),
              eq(contractorMembers.status, 'active'),
              eq(contractorMembers.role, 'owner'),
            ),
          )
          .for('update')
        if (owners.length <= 1) throw new Error('LAST_OWNER')
      }

      await tx
        .delete(contractorMembers)
        .where(
          and(
            eq(contractorMembers.contractorId, contractor.id),
            eq(contractorMembers.userId, user.id),
          ),
        )

      // Repoint the active workspace to another membership, or clear it.
      const [next] = await tx
        .select({ contractorId: contractorMembers.contractorId })
        .from(contractorMembers)
        .where(
          and(
            eq(contractorMembers.userId, user.id),
            eq(contractorMembers.status, 'active'),
          ),
        )
        .orderBy(contractorMembers.createdAt)
        .limit(1)
      await tx
        .update(users)
        .set({ activeContractorId: next?.contractorId ?? null })
        .where(eq(users.id, user.id))
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'LAST_OWNER') {
      return {
        success: false,
        error: 'You’re the last owner. Make someone else an owner before leaving.',
      }
    }
    if (e instanceof Error && e.message === 'NOT_MEMBER') {
      return { success: false, error: 'You’re not a member of this company.' }
    }
    throw e
  }

  revalidatePath('/contractor', 'layout')
  return { success: true }
}

type InviteRow = {
  id: string
  contractorId: string
  email: string
  role: 'owner' | 'admin' | 'member'
  expiresAt: Date | null
  acceptedAt: Date | null
}

async function loadInvite(token: string): Promise<InviteRow | null> {
  const [invite] = await db
    .select({
      id: contractorInvitations.id,
      contractorId: contractorInvitations.contractorId,
      email: contractorInvitations.email,
      role: contractorInvitations.role,
      expiresAt: contractorInvitations.expiresAt,
      acceptedAt: contractorInvitations.acceptedAt,
    })
    .from(contractorInvitations)
    .where(eq(contractorInvitations.token, token))
    .limit(1)
  return invite ?? null
}

function inviteProblem(invite: InviteRow | null): string | null {
  if (!invite || invite.acceptedAt) return 'This invitation is no longer valid.'
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return 'This invitation has expired.'
  }
  return null
}

// Add the membership, mark the invite accepted, and switch the user into the
// new company — all atomically. Idempotent on the membership unique index.
async function joinCompany(userId: string, invite: InviteRow): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(contractorMembers)
      .values({
        contractorId: invite.contractorId,
        userId,
        role: invite.role,
        status: 'active',
      })
      .onConflictDoNothing()
    await tx
      .update(contractorInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(contractorInvitations.id, invite.id))
    await tx
      .update(users)
      .set({ activeContractorId: invite.contractorId })
      .where(eq(users.id, userId))
  })
  revalidatePath('/contractor', 'layout')
}

/**
 * Accept an invitation as the currently signed-in user (token-authority — the
 * secret link is the proof; the invited email is just the delivery address).
 * Multi-company: an existing contractor can join an additional company. A
 * homeowner/admin account can't become a company member (one role per account).
 */
export async function acceptInvitation(token: string): Promise<Result> {
  const user = await getRequiredUser()
  if (typeof token !== 'string' || !token) {
    return { success: false, error: 'Invalid invitation.' }
  }

  const invite = await loadInvite(token)
  const problem = inviteProblem(invite)
  if (problem || !invite) return { success: false, error: problem ?? 'Invalid invitation.' }

  if (user.role !== 'contractor') {
    return {
      success: false,
      error: 'This invite needs a contractor account. Use a different account to join.',
    }
  }

  const existing = await getMembershipRole(user.id, invite.contractorId)
  if (existing) {
    return { success: false, error: 'You’re already a member of this company.' }
  }

  await joinCompany(user.id, invite)
  return { success: true }
}

const SignupAcceptSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().trim().min(2, 'Enter your name'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

/**
 * Create a brand-new contractor account bound to the invite's email and join the
 * company — no own company, no signup bonus (that's only for self-serve signups).
 */
export async function signupAndAcceptInvitation(input: unknown): Promise<Result> {
  const parsed = SignupAcceptSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Check your details.'
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, error: msg, fieldErrors }
  }
  const { token, fullName, password } = parsed.data

  const invite = await loadInvite(token)
  const problem = inviteProblem(invite)
  if (problem || !invite) return { success: false, error: problem ?? 'Invalid invitation.' }

  const email = invite.email.trim().toLowerCase()
  const admin = createAdminClient()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createErr || !created.user) {
    const msg = (createErr?.message ?? '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return { success: false, error: 'You already have an account — sign in to accept.' }
    }
    console.error('[signupAndAcceptInvitation] create-user failed', createErr)
    return { success: false, error: 'Could not create your account. Please try again.' }
  }
  const userId = created.user.id

  try {
    await db
      .insert(users)
      .values({ id: userId, email, fullName, role: 'contractor', passwordSet: true })
      .onConflictDoUpdate({ target: users.id, set: { email, fullName } })
    await joinCompany(userId, invite)
  } catch (err) {
    console.error('[signupAndAcceptInvitation] provisioning failed', err)
    await admin.auth.admin.deleteUser(userId).catch(() => undefined)
    return { success: false, error: 'Could not finish setting up your account.' }
  }

  // Set the session cookie so they land authenticated.
  const ssr = await createClient()
  const { error: signInErr } = await ssr.auth.signInWithPassword({ email, password })
  if (signInErr) {
    return { success: false, error: 'Account created — please sign in to continue.' }
  }

  return { success: true }
}
