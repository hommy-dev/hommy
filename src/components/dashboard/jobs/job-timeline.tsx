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

// Per-viewer labels, keyed by milestone. The contractor reads a lead/quote-
// centric story; the homeowner reads their own ("Request posted", "Quote
// received", "You hired"). Falls back to the milestone's stored label.
const TIMELINE_LABELS: Record<"contractor" | "homeowner", Record<string, string>> = {
  contractor: {
    offered: "Lead received",
    viewed: "Viewed",
    chat: "Chat started",
    quoted: "Quote sent",
    won: "Hired",
    completed: "Completed",
  },
  homeowner: {
    offered: "Request posted",
    viewed: "Contractor viewed",
    chat: "Contractor reached out",
    quoted: "Quote received",
    won: "You hired",
    completed: "Job completed",
  },
};

/**
 * Lifecycle progress for a job, personalized per viewer. A step counts as done
 * if it has a timestamp OR any later step does — so a skipped optional step (e.g.
 * "Viewed" when a contractor engaged without viewing first) still renders as
 * passed instead of leaving a confusing gap before completed steps.
 */
export function JobTimeline({
  milestones,
  viewerRole = "contractor",
}: {
  milestones: JobMilestone[];
  viewerRole?: "contractor" | "homeowner";
}) {
  // Monotonic fill: latest index that actually happened.
  let lastDone = -1;
  milestones.forEach((m, i) => {
    if (m.at) lastDone = i;
  });
  const active = lastDone + 1; // number of completed steps

  return (
    <Timeline value={active} orientation="vertical">
      {milestones.map((m, i) => {
        const done = i <= lastDone;
        const label = TIMELINE_LABELS[viewerRole][m.key] ?? m.label;
        return (
          <TimelineItem key={m.key} step={i + 1} className="group-data-[orientation=vertical]/timeline:ms-6">
            <TimelineHeader>
              <TimelineTitle className={done ? "text-foreground" : "text-muted-foreground"}>
                {label}
              </TimelineTitle>
              {m.at ? <TimelineDate>{formatDate(m.at)}</TimelineDate> : null}
            </TimelineHeader>
            <TimelineIndicator />
            <TimelineSeparator />
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
