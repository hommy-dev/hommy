// Human copy for score-event kinds — keeps the contractor-facing reputation
// view readable. The enum carries internal names (e.g. `lead_ignored_no_reason`);
// these are what the company actually sees. Kept here so the page/components
// stay presentational.

import type { ScoreEventKind } from '@/lib/data/reputation'

type EventCopy = { title: string; blurb: string }

const EVENT_COPY: Record<ScoreEventKind, EventCopy> = {
  fast_engagement: {
    title: 'Engaged a new lead',
    blurb: 'You started a conversation with a homeowner.',
  },
  quote_accepted: {
    title: 'Won a job',
    blurb: 'A homeowner accepted your quote.',
  },
  review_received: {
    title: 'Received a review',
    blurb: 'A homeowner rated their experience with you.',
  },
  lead_ignored_with_reason: {
    title: 'Declined a lead',
    blurb: "You passed and told us why — that's fine, it keeps the pipeline honest.",
  },
  lead_ignored_no_reason: {
    title: 'Declined without a reason',
    blurb: 'Letting a lead go without a reason dips your score slightly.',
  },
  slow_response: {
    title: 'Slow to respond',
    blurb: 'A lead timed out before you replied.',
  },
  off_platform_flag: {
    title: 'Flagged: taken off Hommy',
    blurb: 'A deal appeared to move off-platform. Keep work on Hommy to protect your score.',
  },
  pattern_no_quotes: {
    title: 'Engaging but not quoting',
    blurb: "You've engaged leads without sending quotes.",
  },
}

/** Title + short explanation for a score event. `note` (e.g. a decline reason)
 *  is appended by the caller when present. */
export function scoreEventCopy(kind: ScoreEventKind): EventCopy {
  return EVENT_COPY[kind]
}

/** Plain-language standing for a profile score (floors at 0, no fixed ceiling).
 *  Used on the reputation page and as a compact profile trust signal. */
export function scoreStanding(score: number): { label: string; blurb: string } {
  if (score <= 0)
    return {
      label: 'Just getting started',
      blurb: 'Engage your first leads to start building a track record.',
    }
  if (score < 20)
    return {
      label: 'Building',
      blurb: "You're on your way. Keep engaging and winning work to climb.",
    }
  if (score < 50)
    return {
      label: 'Established',
      blurb: "Solid standing. Homeowners' jobs are reaching you ahead of newer roofers.",
    }
  return {
    label: 'Strong',
    blurb: "You're near the top of the list when new jobs go out.",
  }
}
