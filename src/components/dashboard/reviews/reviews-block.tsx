"use client";

import { useState } from "react";
import type { ContractorReview, ReviewsSummary } from "@/lib/data/reviews";
import { ReviewsSummaryCard } from "./reviews-summary";
import { ReviewList } from "./review-list";

const INITIAL = 6;

/** Reviews summary + a masonry list that expands past the first handful. */
export function ReviewsBlock({
  summary,
  reviews,
  flat,
}: {
  summary: ReviewsSummary;
  reviews: ContractorReview[];
  /** Drop the summary's own card chrome (when wrapped in a section card). */
  flat?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? reviews : reviews.slice(0, INITIAL);

  return (
    <div className="space-y-5 lg:space-y-[1.389vw]">
      <ReviewsSummaryCard summary={summary} flat={flat} />
      <ReviewList reviews={shown} className="space-y-4 lg:space-y-[1.111vw]" />
      {reviews.length > INITIAL ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm lg:text-[0.903vw] font-medium text-primary transition-colors hover:underline"
        >
          {expanded ? "Show less" : `Show all ${reviews.length} reviews`}
        </button>
      ) : null}
    </div>
  );
}
