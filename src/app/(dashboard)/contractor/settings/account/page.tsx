import { getRequiredUser } from "@/lib/auth/session"
import { AccountSettings } from "@/components/dashboard/settings/account-settings"

export default async function ContractorAccountPage() {
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
