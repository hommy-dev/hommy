import type { BoardStatus, LeadUrgency } from "@/lib/data/jobs";

/** Column order for the live board (lost is hidden behind a filter). */
export const BOARD_COLUMNS: BoardStatus[] = ["new", "talking", "quoted", "won", "done"];

export const BOARD_META: Record<BoardStatus, { label: string; pill: string }> = {
  new: { label: "New", pill: "bg-secondary text-secondary-foreground" },
  talking: { label: "Talking", pill: "bg-muted text-foreground/70" },
  quoted: { label: "Quoted", pill: "bg-info/15 text-info" },
  won: { label: "Won", pill: "bg-primary/10 text-primary" },
  done: { label: "Done", pill: "bg-success text-success-foreground" },
  lost: { label: "Lost", pill: "bg-muted text-muted-foreground" },
};

/** Left-edge accent color per status (matches the pill semantics). */
export const BOARD_ACCENT: Record<BoardStatus, string> = {
  new: "bg-secondary",
  talking: "bg-muted-foreground/40",
  quoted: "bg-info",
  won: "bg-primary",
  done: "bg-success",
  lost: "bg-muted-foreground/30",
};

export const URGENCY_LABEL: Record<LeadUrgency, string> = {
  emergency: "Emergency",
  within_week: "This week",
  within_month: "This month",
  planning: "Planning",
};

export const URGENCY_PILL: Record<LeadUrgency, string> = {
  emergency: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  within_week: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  within_month: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
