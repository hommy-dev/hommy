import { getRequiredUser } from "@/lib/auth/session"
import {
  SettingsSection,
} from "@/components/dashboard/settings/settings-section"
import { AccountForm } from "@/components/dashboard/settings/account-form"
import { PasswordCard } from "@/components/dashboard/settings/password-card"

export default async function HomeownerAccountPage() {
  const user = await getRequiredUser("homeowner")

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <SettingsSection title="My profile" description="Your contact details.">
        <AccountForm
          initial={{
            fullName: user.fullName ?? "",
            email: user.email,
            phone: user.phone ?? "",
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Password"
        description={
          user.passwordSet
            ? "Change the password you use to sign in."
            : "Set a password so you can sign in with your email."
        }
      >
        <PasswordCard hasPassword={user.passwordSet} />
      </SettingsSection>
    </div>
  )
}
