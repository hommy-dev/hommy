import { cn } from "@/lib/utils";
import type { ProjectStage } from "@/lib/data/projects";

const STAGE: Record<ProjectStage, { label: string; pill: string }> = {
  new_lead: { label: "New", pill: "bg-secondary text-secondary-foreground" },
  contacted: { label: "Contacted", pill: "bg-muted text-foreground/70" },
  estimate_sent: { label: "Quoted", pill: "bg-info/15 text-info" },
  in_progress: { label: "In progress", pill: "bg-primary/10 text-primary" },
  completed: { label: "Completed", pill: "bg-success text-success-foreground" },
  lost: { label: "Lost", pill: "bg-muted text-muted-foreground" },
};

export function StageBadge({ stage, className }: { stage: ProjectStage; className?: string }) {
  const s = STAGE[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md lg:rounded-[0.417vw] px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-medium whitespace-nowrap",
        s.pill,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
