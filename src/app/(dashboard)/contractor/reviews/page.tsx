import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getContractorReviews } from "@/lib/data/reviews"
import { ReviewsSummaryCard } from "@/components/dashboard/reviews/reviews-summary"
import { ReviewList } from "@/components/dashboard/reviews/review-list"
import { EmptyState } from "@/components/ui/empty-state"

export default async function ReviewsPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)

  if (!contractor) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your contractor profile isn’t set up yet.
      </p>
    )
  }

  const summary = await getContractorReviews(contractor.id)

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="w-full">
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Reviews
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Feedback from homeowners after completed jobs. It feeds your profile
          score.
        </p>
      </header>

      {summary.total === 0 ? (
        <EmptyState
          icon="star"
          title="No reviews yet"
          description="Once you finish a job, we'll ask the homeowner to leave a review. Their feedback helps your profile score and brings in more leads."
        />
      ) : (
        <>
          <ReviewsSummaryCard summary={summary} />
          <ReviewList reviews={summary.reviews} />
        </>
      )}
    </div>
  )
}
