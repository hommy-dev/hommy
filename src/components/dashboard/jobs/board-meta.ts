import type { BoardStatus, LeadUrgency } from "@/lib/data/jobs";

/** Column order for the live board (lost is hidden behind a filter). */
export const BOARD_COLUMNS: BoardStatus[] = ["new", "talking", "quoted", "won", "done"];

export const BOARD_META: Record<BoardStatus, { label: string; pill: string }> = {
  new: { label: "New", pill: "bg-secondary text-secondary-foreground" },
  talking: { label: "Talking", pill: "bg-muted text-foreground/70" },
  quoted: { label: "Quoted", pill: "bg-info/15 text-info" },
  won: { label: "In progress", pill: "bg-primary/10 text-primary" },
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

/** Soft status chip — gentle tint + readable colored text (used on the cards). */
export const BOARD_BADGE: Record<BoardStatus, string> = {
  new: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  talking: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  quoted: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  won: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  lost: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

/** Faint full-card wash + a hover border, matched to the status (very subtle). */
export const BOARD_TINT: Record<BoardStatus, string> = {
  new: "border-sky-200/70 bg-sky-50/30 hover:border-sky-300 dark:border-sky-900/50 dark:bg-sky-950/20 dark:hover:border-sky-800",
  talking: "border-amber-200/70 bg-amber-50/30 hover:border-amber-300 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:border-amber-800",
  quoted: "border-violet-200/70 bg-violet-50/30 hover:border-violet-300 dark:border-violet-900/50 dark:bg-violet-950/20 dark:hover:border-violet-800",
  won: "border-indigo-200/70 bg-indigo-50/30 hover:border-indigo-300 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:hover:border-indigo-800",
  done: "border-emerald-200/70 bg-emerald-50/30 hover:border-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:border-emerald-800",
  lost: "border-border bg-card hover:border-foreground/25",
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
