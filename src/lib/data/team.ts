// Team data for the contractor settings hub: active members, pending invites,
// and seat usage (active members + pending invites vs the plan's max_members).

import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractorMembers,
  contractorInvitations,
  plans,
  subscriptions,
  users,
} from '@/lib/db/schema'

export type MemberRole = (typeof contractorMembers.role.enumValues)[number]

export type TeamMember = {
  userId: string
  fullName: string | null
  email: string
  role: MemberRole
  createdAt: Date
}

export type TeamInvite = {
  id: string
  email: string
  role: MemberRole
  token: string
  createdAt: Date
  expiresAt: Date | null
  expired: boolean
}

export type TeamData = {
  members: TeamMember[]
  invitations: TeamInvite[]
  seats: { used: number; max: number; planName: string }
}

export async function getTeam(contractorId: string): Promise<TeamData> {
  const members = await db
    .select({
      userId: contractorMembers.userId,
      role: contractorMembers.role,
      createdAt: contractorMembers.createdAt,
      fullName: users.fullName,
      email: users.email,
    })
    .from(contractorMembers)
    .innerJoin(users, eq(users.id, contractorMembers.userId))
    .where(
      and(
        eq(contractorMembers.contractorId, contractorId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .orderBy(contractorMembers.createdAt)

  const now = Date.now()
  const inviteRows = await db
    .select({
      id: contractorInvitations.id,
      email: contractorInvitations.email,
      role: contractorInvitations.role,
      token: contractorInvitations.token,
      createdAt: contractorInvitations.createdAt,
      expiresAt: contractorInvitations.expiresAt,
    })
    .from(contractorInvitations)
    .where(
      and(
        eq(contractorInvitations.contractorId, contractorId),
        isNull(contractorInvitations.acceptedAt),
      ),
    )
    .orderBy(contractorInvitations.createdAt)

  const invitations: TeamInvite[] = inviteRows.map((i) => ({
    ...i,
    expired: !!i.expiresAt && i.expiresAt.getTime() < now,
  }))
  const activeInviteCount = invitations.filter((i) => !i.expired).length

  const [sub] = await db
    .select({ maxMembers: plans.maxMembers, planName: plans.name })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.contractorId, contractorId),
        eq(subscriptions.status, 'active'),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  return {
    members,
    invitations,
    seats: {
      used: members.length + activeInviteCount,
      max: sub?.maxMembers ?? 1,
      planName: sub?.planName ?? 'Free',
    },
  }
}
