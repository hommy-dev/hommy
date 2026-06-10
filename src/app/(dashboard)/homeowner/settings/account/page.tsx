import { getRequiredUser } from "@/lib/auth/session"
import { AccountSettings } from "@/components/dashboard/settings/account-settings"

export default async function HomeownerAccountPage() {
  const user = await getRequiredUser("homeowner")
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
