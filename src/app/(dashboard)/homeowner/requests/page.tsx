import Link from "next/link";
import { getRequiredUser } from "@/lib/auth/session";
import {
  deriveRequestStatus,
  getHomeownerForUser,
  getHomeownerLeads,
  type HomeownerLead,
} from "@/lib/data/homeowner";
import { Button } from "@/components/ui/button";
import { HomeownerJobsTable } from "@/components/dashboard/requests/homeowner-jobs-table";
import type { RequestCardItem } from "@/components/dashboard/requests/request-meta";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";

// Plain-language "what's happening now" line — the single most useful thing for
// a homeowner watching their job.
function summary(r: HomeownerLead): string {
  if (r.projectCompleted) return "The job is complete.";
  if (r.status === "awarded") return "You hired a contractor for this job.";
  if (r.status === "closed") return "This job was closed.";
  if (r.status === "expired") return "This job expired with no hire.";
  if (r.quoteCount > 0)
    return `${r.quoteCount} quote${
      r.quoteCount === 1 ? "" : "s"
    } in — review and choose.`;
  if (r.interestedCount > 0)
    return `${r.interestedCount} pro${
      r.interestedCount === 1 ? " is" : "s are"
    } interested — quotes coming.`;
  if (r.viewedCount > 0)
    return `${r.viewedCount} pro${
      r.viewedCount === 1 ? "" : "s"
    } viewed your job — messages coming soon.`;
  if (r.matchedCount > 0)
    return `${r.matchedCount} pro${
      r.matchedCount === 1 ? "" : "s"
    } matched — waiting for them to respond.`;
  return "No pros cover your area yet — we'll alert you the moment one joins.";
}

export default async function HomeownerJobsPage() {
  const user = await getRequiredUser("homeowner");
  const ho = await getHomeownerForUser(user.id);
  const requests = ho ? await getHomeownerLeads(ho.id) : [];

  const items: RequestCardItem[] = requests.map((r) => ({
    id: r.id,
    serviceName: r.serviceName,
    subtype: r.subtype,
    requestStatus: deriveRequestStatus({
      status: r.status,
      interestedCount: r.interestedCount,
      quoteCount: r.quoteCount,
      projectCompleted: r.projectCompleted,
    }),
    city: r.city,
    state: r.state,
    zipCode: r.zipCode,
    quoteCount: r.quoteCount,
    bestQuoteTotal: r.bestQuoteTotal,
    summary: summary(r),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="flex items-end justify-between gap-4 lg:gap-[1.111vw]">
        <div>
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
            Jobs
          </h1>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            Your posted jobs and how they’re progressing.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon="paper"
          title="No jobs yet"
          description="Post your first project and start receiving quotes from vetted local pros."
          action={
            <Button asChild size="lg">
              <Link href="/get-a-quote">
                <Icon name="plus" />
                Post first job
              </Link>
            </Button>
          }
        />
      ) : (
        <HomeownerJobsTable items={items} />
      )}
    </div>
  );
}
