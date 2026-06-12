import { getReviewByToken } from "@/lib/data/reviews"
import { ReviewForm } from "@/components/reviews/review-form"

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const view = await getReviewByToken(token)

  return (
    <main className="flex min-h-svh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <p className="font-sebenta text-lg font-bold tracking-tight">Homei</p>

        {!view ? (
          <Notice
            title="Link not found"
            body="This review link is invalid or has expired. Please check your email for the latest one."
          />
        ) : view.submitted ? (
          <Notice
            title="Thanks for your review"
            body="Your feedback has been recorded — it helps other homeowners choose with confidence."
          />
        ) : (
          <>
            <div className="mt-5">
              <h1 className="text-lg font-semibold">
                How was {view.contractorName ?? "your contractor"}?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Rate the {view.subtype ?? view.serviceName} work they did for you.
              </p>
            </div>
            <ReviewForm token={token} contractorName={view.contractorName ?? "your contractor"} />
          </>
        )}
      </div>
    </main>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
