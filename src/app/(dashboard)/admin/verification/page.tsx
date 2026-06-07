import { getRequiredUser } from "@/lib/auth/session"
import { getVerificationQueue } from "@/lib/data/admin"
import { VerificationReviewCard } from "@/components/admin/verification-review"

export default async function AdminVerificationPage() {
  await getRequiredUser("admin")
  const queue = await getVerificationQueue()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Verification queue
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Review submitted license and insurance documents.{" "}
          {queue.length > 0
            ? `${queue.length} company${queue.length === 1 ? "" : "s"} waiting.`
            : "You’re all caught up."}
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="rounded-2xl lg:rounded-[1.111vw] border border-dashed border-border p-12 lg:p-[3.333vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No companies are waiting for verification right now.
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-[1.111vw]">
          {queue.map((item) => (
            <VerificationReviewCard key={item.contractorId} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
