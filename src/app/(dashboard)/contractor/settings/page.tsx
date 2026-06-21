import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { AccountSettings } from "@/components/dashboard/settings/account-settings"
import { SettingsSectionSkeleton } from "@/components/dashboard/skeletons"

export default function ContractorSettingsPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton rows={2} />}>
      <AccountData />
    </Suspense>
  )
}

async function AccountData() {
  const user = await getRequiredUser("contractor")
  return (
    <AccountSettings
      user={{
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        passwordSet: user.passwordSet,
      }}
    />
  )
}
