import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { ProfileForm } from "@/components/dashboard/profile/profile-form"

export default async function ProfilePage() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)

  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your contractor profile isn’t set up yet.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-3xl lg:max-w-[53.328vw] space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Profile &amp; verification
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Your public profile, plus the credentials we verify before you can
          engage leads.
        </p>
      </header>

      <ProfileForm
        initial={{
          companyName: c.companyName ?? "",
          bio: c.bio ?? "",
          logoUrl: c.logoUrl,
          licenseDocUrl: c.licenseDocUrl,
          insuranceDocUrl: c.insuranceDocUrl,
          verificationState: getVerificationState(c),
        }}
      />
    </div>
  )
}
