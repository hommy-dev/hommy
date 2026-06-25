import { getRequiredUser } from "@/lib/auth/session"
import { adminListSupportThreads } from "@/lib/data/support"
import { SupportInbox } from "@/components/admin/support-inbox"

export default async function AdminSupportPage() {
  await getRequiredUser("admin")
  const threads = await adminListSupportThreads()

  const needsReply = threads.filter((t) => ["open", "in_progress"].includes(t.status)).length

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Support inbox
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Live chat with contractors and homeowners, plus their feature ideas.{" "}
          {needsReply > 0 ? `${needsReply} need a reply.` : "All caught up."}
        </p>
      </header>

      <SupportInbox threads={threads} />
    </div>
  )
}
