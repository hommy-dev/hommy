import { SettingsSection } from "./settings-section"
import { DataRow, Empty } from "./edit-dialog"
import { EditAccountDialog } from "./edit-account-dialog"
import { ChangePasswordDialog } from "./change-password-dialog"

// Shared by the homeowner and contractor "My account" sections — read view with
// edit-in-modal.
export function AccountSettings({
  user,
}: {
  user: {
    fullName: string | null
    email: string
    phone: string | null
    passwordSet: boolean
  }
}) {
  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <SettingsSection
        title="My profile"
        description="Your personal contact details."
        action={
          <EditAccountDialog
            initial={{
              fullName: user.fullName ?? "",
              email: user.email,
              phone: user.phone ?? "",
            }}
          />
        }
      >
        <dl className="divide-y divide-border">
          <DataRow label="Full name">
            {user.fullName || <Empty />}
          </DataRow>
          <DataRow label="Email">{user.email}</DataRow>
          <DataRow label="Phone">{user.phone || <Empty />}</DataRow>
        </dl>
      </SettingsSection>

      <SettingsSection
        title="Password"
        description={
          user.passwordSet
            ? "Your account is protected with a password."
            : "Set a password so you can sign in with your email."
        }
        action={<ChangePasswordDialog hasPassword={user.passwordSet} />}
      >
        <dl className="divide-y divide-border">
          <DataRow label="Password">
            {user.passwordSet ? "••••••••" : <Empty>Not set yet</Empty>}
          </DataRow>
        </dl>
      </SettingsSection>
    </div>
  )
}
