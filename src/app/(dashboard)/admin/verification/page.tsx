import { getRequiredUser } from "@/lib/auth/session"
import { getVerificationQueue } from "@/lib/data/admin"
import { VerificationReviewCard } from "@/components/admin/verification-review"
import { EmptyState } from "@/components/ui/empty-state"

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
        <EmptyState
          icon="shield-done"
          title="You're all caught up"
          description="No companies are waiting for verification right now. New submissions will land here as they come in."
        />
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
