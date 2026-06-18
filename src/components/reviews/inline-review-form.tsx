"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";
import { submitProjectReview } from "@/lib/actions/reviews";

/**
 * Authenticated star + comment review for a completed project. Reused by the
 * in-thread review card and the job-sheet review dialog. Calls back with the
 * rating on success so the parent can flip to a submitted state.
 */
export function InlineReviewForm({
  projectId,
  contractorName,
  onSubmitted,
  starSize = "size-7 lg:size-[2vw]",
}: {
  projectId: string;
  contractorName?: string | null;
  onSubmitted?: (rating: number) => void;
  starSize?: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const shown = hover || rating;

  function submit() {
    if (rating === 0 || pending) return;
    start(async () => {
      const res = await submitProjectReview({ projectId, rating, comment });
      if (res.ok) {
        showToast("Thanks for your review!", { type: "success" });
        onSubmitted?.(rating);
      } else if (res.error === "ALREADY_SUBMITTED") {
        showToast(res.message, { type: "info" });
        onSubmitted?.(rating);
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  return (
    <div className="space-y-3 lg:space-y-[0.833vw]">
      <div className="flex items-center gap-1 lg:gap-[0.278vw]" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(starSize, n <= shown ? "fill-warning text-warning" : "fill-none text-muted-foreground/40")}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={`How was ${contractorName || "the work"}? (optional)`}
        className="w-full resize-none rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
      />

      <button
        type="button"
        onClick={submit}
        disabled={rating === 0 || pending}
        className="w-full rounded-md lg:rounded-[0.417vw] bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
