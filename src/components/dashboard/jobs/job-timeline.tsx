"use client";

import type { JobMilestone } from "@/lib/data/jobs";
import { formatDate } from "@/lib/format";
import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";

/** Lifecycle progress for a job. Steps with a timestamp render as completed. */
export function JobTimeline({ milestones }: { milestones: JobMilestone[] }) {
  // Active step = the last milestone that actually happened (sequential).
  let active = 0;
  milestones.forEach((m, i) => {
    if (m.at) active = i + 1;
  });

  return (
    <Timeline value={active} orientation="vertical">
      {milestones.map((m, i) => (
        <TimelineItem key={m.key} step={i + 1} className="group-data-[orientation=vertical]/timeline:ms-6">
          <TimelineHeader>
            <TimelineTitle className={m.at ? "text-foreground" : "text-muted-foreground"}>
              {m.label}
            </TimelineTitle>
            {m.at ? <TimelineDate>{formatDate(m.at)}</TimelineDate> : null}
          </TimelineHeader>
          <TimelineIndicator />
          <TimelineSeparator />
        </TimelineItem>
      ))}
    </Timeline>
  );
}
