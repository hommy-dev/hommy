import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getMembershipRole } from "@/lib/data/dashboard"
import { getTeam } from "@/lib/data/team"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { TeamManager } from "@/components/dashboard/settings/team-manager"
import { SettingsSectionSkeleton } from "@/components/dashboard/skeletons"

export default function ContractorTeamPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton rows={3} />}>
      <TeamBody />
    </Suspense>
  )
}

async function TeamBody() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const role = await getMembershipRole(user.id, c.id)
  const team = await getTeam(c.id)

  return (
    <SettingsSection
      title="Team"
      description="Invite teammates and manage who can access your company."
    >
      <TeamManager
        initial={team}
        viewerUserId={user.id}
        viewerRole={role ?? "member"}
        canManage={role === "owner" || role === "admin"}
      />
    </SettingsSection>
  )
}
