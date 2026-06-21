import type { HomeownerRequestStatus } from "@/lib/data/homeowner";

export const REQUEST_COLUMNS: HomeownerRequestStatus[] = [
  "posted",
  "interested",
  "quotes",
  "hired",
  "done",
];

export const REQUEST_META: Record<HomeownerRequestStatus, { label: string; pill: string }> = {
  posted: { label: "Posted", pill: "bg-secondary text-secondary-foreground" },
  interested: { label: "Interested", pill: "bg-muted text-foreground/70" },
  quotes: { label: "Quotes in", pill: "bg-info/15 text-info" },
  hired: { label: "Hired", pill: "bg-primary/10 text-primary" },
  done: { label: "Done", pill: "bg-success text-success-foreground" },
};

/** Small status dot color (used in the filter dropdown). */
export const REQUEST_ACCENT: Record<HomeownerRequestStatus, string> = {
  posted: "bg-secondary",
  interested: "bg-muted-foreground/40",
  quotes: "bg-info",
  hired: "bg-primary",
  done: "bg-success",
};

/** Soft status chip — gentle tint + readable colored text (used on the cards). */
export const REQUEST_BADGE: Record<HomeownerRequestStatus, string> = {
  posted: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  interested: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  quotes: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  hired: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
};

/** Faint full-card wash + a hover border, matched to the status (very subtle). */
export const REQUEST_TINT: Record<HomeownerRequestStatus, string> = {
  posted: "border-sky-200/70 bg-sky-50/30 hover:border-sky-300 dark:border-sky-900/50 dark:bg-sky-950/20 dark:hover:border-sky-800",
  interested: "border-amber-200/70 bg-amber-50/30 hover:border-amber-300 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:border-amber-800",
  quotes: "border-violet-200/70 bg-violet-50/30 hover:border-violet-300 dark:border-violet-900/50 dark:bg-violet-950/20 dark:hover:border-violet-800",
  hired: "border-indigo-200/70 bg-indigo-50/30 hover:border-indigo-300 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:hover:border-indigo-800",
  done: "border-emerald-200/70 bg-emerald-50/30 hover:border-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:border-emerald-800",
};

/** Client-safe card shape (no server imports — dates pre-serialized). */
export type RequestCardItem = {
  id: string;
  serviceName: string;
  subtype: string | null;
  requestStatus: HomeownerRequestStatus;
  /** Photos the homeowner attached when posting (may be empty). */
  images: string[];
  city: string | null;
  state: string | null;
  zipCode: string | null;
  quoteCount: number;
  /** Best (lowest) quote total received, for the table's Quote column. */
  bestQuoteTotal: string | null;
  /** Job is finished and the homeowner still owes a review — show "Leave a review". */
  canReview: boolean;
  summary: string;
  /** ISO timestamp the request was posted. */
  createdAt: string;
};
