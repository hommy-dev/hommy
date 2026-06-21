"use client";

import type { BoardStatus, JobCard as Job } from "@/lib/data/jobs";
import { cn } from "@/lib/utils";
import { JobCardItem } from "./job-cards";
import { BOARD_ACCENT, BOARD_COLUMNS, BOARD_META } from "./board-meta";

export function JobKanban({
  jobs,
  onView,
}: {
  jobs: Job[];
  onView: (leadId: string) => void;
}) {
  const byStatus = new Map<BoardStatus, Job[]>();
  for (const status of BOARD_COLUMNS) byStatus.set(status, []);
  for (const job of jobs) byStatus.get(job.boardStatus)?.push(job);

  return (
    <div className="-mx-1 flex gap-4 lg:gap-[1.111vw] overflow-x-auto px-1 pb-1 lg:pb-[0.278vw] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {BOARD_COLUMNS.map((status) => {
        const colJobs = byStatus.get(status) ?? [];
        return (
          <section key={status} className="flex w-[19rem] lg:w-[22vw] shrink-0 flex-col">
            <header className="mb-3 lg:mb-[0.833vw] flex items-center gap-2 lg:gap-[0.556vw] px-1">
              <span className={cn("size-2.5 lg:size-[0.694vw] rounded-full", BOARD_ACCENT[status])} />
              <h3 className="text-sm lg:text-[0.972vw] font-semibold">{BOARD_META[status].label}</h3>
              <span className="text-xs lg:text-[0.833vw] tabular-nums text-muted-foreground">{colJobs.length}</span>
            </header>

            <div className="flex flex-col gap-3 lg:gap-[0.833vw]">
              {colJobs.length === 0 ? (
                <div className="rounded-xl lg:rounded-[0.833vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-8 lg:py-[2.222vw] text-center text-xs lg:text-[0.833vw] text-muted-foreground">
                  Nothing here
                </div>
              ) : (
                colJobs.map((job) => <JobCardItem key={job.leadId} job={job} onView={onView} inColumn />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
