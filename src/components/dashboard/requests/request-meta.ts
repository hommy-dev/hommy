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

/** Client-safe card shape (no server imports — dates pre-serialized). */
export type RequestCardItem = {
  id: string;
  serviceName: string;
  subtype: string | null;
  requestStatus: HomeownerRequestStatus;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  quoteCount: number;
  summary: string;
};
