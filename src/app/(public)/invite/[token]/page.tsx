import Link from "next/link"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { contractorInvitations, contractors } from "@/lib/db/schema"
import { getOptionalUser } from "@/lib/auth/session"
import { InviteAccept } from "@/components/auth/invite-accept"

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const [invite] = await db
    .select({
      email: contractorInvitations.email,
      role: contractorInvitations.role,
      expiresAt: contractorInvitations.expiresAt,
      acceptedAt: contractorInvitations.acceptedAt,
      company: contractors.companyName,
    })
    .from(contractorInvitations)
    .innerJoin(contractors, eq(contractors.id, contractorInvitations.contractorId))
    .where(eq(contractorInvitations.token, token))
    .limit(1)

  const valid =
    invite &&
    !invite.acceptedAt &&
    // eslint-disable-next-line react-hooks/purity -- server component; evaluated once per request, not re-rendered
    (!invite.expiresAt || invite.expiresAt.getTime() > Date.now())

  const user = await getOptionalUser()

  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-6 lg:px-[1.667vw] text-foreground">
      <div className="w-full max-w-md lg:max-w-[31.108vw] rounded-lg lg:rounded-[0.833vw] border border-border bg-card p-8 lg:p-[2.222vw] text-center">
        <Link href="/" className="font-sebenta text-lg lg:text-[1.25vw] font-bold">
          Hommy
        </Link>

        {!valid || !invite ? (
          <>
            <h1 className="mt-6 lg:mt-[1.667vw] font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
              Invitation not valid
            </h1>
            <p className="mt-2 lg:mt-[0.556vw] text-sm lg:text-[0.972vw] text-muted-foreground">
              This invite link has expired or already been used. Ask your team to
              send a new one.
            </p>
            <Link
              href="/"
              className="mt-6 lg:mt-[1.667vw] inline-block text-sm lg:text-[0.972vw] font-semibold text-primary hover:underline"
            >
              Go home
            </Link>
          </>
        ) : (
          <InviteAccept
            token={token}
            companyName={invite.company ?? "a company"}
            role={invite.role}
            inviteEmail={invite.email}
            loggedIn={!!user}
            viewerEmail={user?.email ?? null}
            viewerIsContractor={user?.role === "contractor"}
          />
        )}
      </div>
    </div>
  )
}
