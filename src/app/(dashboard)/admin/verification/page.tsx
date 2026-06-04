import { getRequiredUser } from "@/lib/auth/session"
import { getVerificationQueue } from "@/lib/data/admin"
import { VerificationReviewCard } from "@/components/admin/verification-review"

export default async function AdminVerificationPage() {
  await getRequiredUser("admin")
  const queue = await getVerificationQueue()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-sebenta text-2xl font-bold tracking-tight">
          Verification queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review submitted license and insurance documents.{" "}
          {queue.length > 0
            ? `${queue.length} company${queue.length === 1 ? "" : "s"} waiting.`
            : "You’re all caught up."}
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No companies are waiting for verification right now.
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <VerificationReviewCard key={item.contractorId} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
