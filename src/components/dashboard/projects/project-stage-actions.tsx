"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import { advanceProjectStage } from "@/lib/actions/projects";
import type { ProjectStage } from "@/lib/data/projects";

const NEXT: Partial<Record<ProjectStage, { to: ProjectStage; label: string }>> = {
  new_lead: { to: "contacted", label: "Mark contacted" },
  in_progress: { to: "completed", label: "Mark completed" },
};

/** Contextual stage-advance button for the project workspace (or nothing). */
export function ProjectStageActions({ projectId, stage }: { projectId: string; stage: ProjectStage }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = NEXT[stage];
  if (!next) return null;

  function go() {
    if (pending) return;
    start(async () => {
      const res = await advanceProjectStage(projectId, next!.to);
      if (res.ok) {
        showToast(
          next!.to === "completed" ? "Marked completed — we’ll ask the homeowner for a review." : "Updated.",
          { type: "success" },
        );
        router.refresh();
      } else {
        showToast(res.message, { type: "error" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="rounded-md lg:rounded-[0.556vw] border border-border bg-card px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Saving…" : next.label}
    </button>
  );
}
