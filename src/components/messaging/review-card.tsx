"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { MessageMeta } from "@/lib/db/schema";
import type { ParticipantIdentity } from "@/lib/data/conversations";
import { Stars } from "@/components/reviews/stars";
import { InlineReviewForm } from "@/components/reviews/inline-review-form";

/**
 * Inline "leave a review" card, posted when a job is completed. The homeowner
 * rates right in the thread; once submitted (here, via the email link, or
 * earlier), it shows a read-only thank-you and never prompts again.
 */
export function ReviewCard({
  meta,
  viewerType,
  reviewState,
}: {
  meta: Extract<MessageMeta, { kind: "review" }>;
  viewerType?: ParticipantIdentity["type"];
  /** Live review state from the job panel — keeps the card in sync with reality. */
  reviewState?: { submitted: boolean; rating: number | null; canReview: boolean };
}) {
  const alreadySubmitted = meta.status === "submitted" || Boolean(reviewState?.submitted);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [rating, setRating] = useState<number>(reviewState?.rating ?? meta.rating ?? 0);

  const isHomeowner = viewerType === "user";

  return (
    <div className="flex justify-center py-1.5 lg:py-[0.417vw]">
      <div className="w-full max-w-[22rem] lg:max-w-[24vw] rounded-lg lg:rounded-[0.694vw] border border-border bg-card p-4 lg:p-[1.111vw]">
        <div className="flex items-center gap-2 lg:gap-[0.556vw]">
          <span className="grid size-8 lg:size-[2.222vw] place-items-center rounded-md lg:rounded-[0.556vw] bg-muted text-warning">
            <Star className="size-4 lg:size-[1.111vw] fill-warning" strokeWidth={2} />
          </span>
          <p className="text-sm lg:text-[0.903vw] font-semibold">
            {submitted ? "Review submitted" : "How was the job?"}
          </p>
        </div>

        {submitted ? (
          <div className="mt-3 lg:mt-[0.833vw] space-y-1 lg:space-y-[0.278vw]">
            {rating > 0 ? <Stars rating={rating} starClassName="lg:size-[1.111vw]" /> : null}
            <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
              Thanks for your feedback — it helps other homeowners choose.
            </p>
          </div>
        ) : isHomeowner ? (
          <div className="mt-3 lg:mt-[0.833vw]">
            <InlineReviewForm
              projectId={meta.projectId}
              onSubmitted={(r) => {
                setRating(r);
                setSubmitted(true);
              }}
            />
          </div>
        ) : (
          <p className="mt-2 lg:mt-[0.556vw] text-xs lg:text-[0.833vw] text-muted-foreground">
            Awaiting the homeowner’s review.
          </p>
        )}
      </div>
    </div>
  );
}
