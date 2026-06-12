"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";
import { submitReview } from "@/lib/actions/reviews";

/** Interactive 1–5 star picker + comment → submitReview by token. */
export function ReviewForm({ token, contractorName }: { token: string; contractorName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (rating === 0 || pending) return;
    start(async () => {
      const res = await submitReview({ token, rating, comment });
      if (res.ok) {
        showToast("Thanks for your review!", { type: "success" });
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  const shown = hover || rating;

  return (
    <div className="mt-5 space-y-5">
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
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
              className={cn("size-9", n <= shown ? "fill-warning text-warning" : "fill-none text-muted-foreground/40")}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder={`Tell others about your experience with ${contractorName} (optional)`}
        className="w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
      />

      <button
        type="button"
        onClick={submit}
        disabled={rating === 0 || pending}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
