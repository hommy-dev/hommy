import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getMembershipRole } from "@/lib/data/dashboard"
import {
  getVerificationState,
  type VerificationState,
} from "@/lib/contractor/verification"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { DataRow, Empty } from "@/components/dashboard/settings/edit-dialog"
import { EditVerificationDialog } from "@/components/dashboard/settings/edit-verification-dialog"
import { SettingsSectionSkeleton } from "@/components/dashboard/skeletons"
import { cn } from "@/lib/utils"

const STATUS: Record<VerificationState, { label: string; cls: string }> = {
  verified: { label: "Verified", cls: "bg-secondary text-secondary-foreground" },
  in_review: {
    label: "In review",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  rejected: { label: "Needs attention", cls: "bg-destructive/10 text-destructive" },
  not_started: { label: "Not started", cls: "bg-muted text-muted-foreground" },
}

function DocValue({ url }: { url: string | null }) {
  if (!url) return <Empty>Not uploaded</Empty>
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary hover:underline"
    >
      Uploaded · View
    </a>
  )
}

export default function ContractorVerificationPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton rows={2} />}>
      <VerificationBody />
    </Suspense>
  )
}

async function VerificationBody() {
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
  const canManage = role === "owner" || role === "admin"
  const state = getVerificationState(c)
  const badge = STATUS[state]

  return (
    <SettingsSection
      title="Verification"
      description="License and insurance. Required before you can engage leads."
      action={
        canManage && state !== "verified" ? (
          <EditVerificationDialog
            initial={{ licenseDocUrl: c.licenseDocUrl, insuranceDocUrl: c.insuranceDocUrl }}
            resubmit={state !== "not_started"}
          />
        ) : undefined
      }
    >
      <div className="space-y-5 lg:space-y-[1.389vw]">
        <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
          <span className="text-sm lg:text-[0.972vw] text-muted-foreground">
            Status
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-semibold",
              badge.cls,
            )}
          >
            {badge.label}
          </span>
        </div>

        {state === "verified" ? (
          <div className="rounded-md lg:rounded-[0.556vw] border border-secondary/40 bg-secondary/15 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] text-foreground/75">
            You’re verified. Set to engage leads and send quotes.
          </div>
        ) : state === "rejected" ? (
          <div className="rounded-md lg:rounded-[0.556vw] border border-destructive/30 bg-destructive/5 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] text-destructive">
            Your last submission needs attention. Update your documents and
            resubmit.
          </div>
        ) : state === "in_review" ? (
          <div className="rounded-md lg:rounded-[0.556vw] border border-amber-300/50 bg-amber-50 px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            We’re reviewing your documents.
          </div>
        ) : null}

        <dl className="divide-y divide-border">
          <DataRow label="License document">
            <DocValue url={c.licenseDocUrl} />
          </DataRow>
          <DataRow label="Insurance certificate">
            <DocValue url={c.insuranceDocUrl} />
          </DataRow>
        </dl>
      </div>
    </SettingsSection>
  )
}
