import type { CoveragePoint } from "@/lib/data/analytics";
import type { ServiceArea } from "@/lib/data/dashboard";
import { coverageBadge } from "@/lib/coverage";
import { Icon } from "@/components/ui/icon";
import { CoverageMap } from "@/components/dashboard/analytics/coverage-map";

/** The profile's coverage footprint — a mini US map of served areas + the list. */
export function CoverageCard({
  areas,
  canManage,
}: {
  areas: ServiceArea[];
  canManage: boolean;
}) {
  if (areas.length === 0) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        {canManage
          ? "No coverage areas yet. Add the places you serve so we can match you to nearby jobs."
          : "No coverage areas yet."}
      </p>
    );
  }

  const origins: CoveragePoint[] = areas
    .filter((a): a is ServiceArea & { lat: number; lng: number } => a.lat != null && a.lng != null)
    .map((a) => ({ name: a.label ?? "Area", lat: a.lat, lng: a.lng }));

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {origins.length > 0 ? (
        <CoverageMap hub={null} origins={origins} legend={{ origin: "Service area" }} />
      ) : null}
      <ul className="space-y-3 lg:space-y-[0.833vw] text-sm lg:text-[0.972vw]">
        {areas.map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 lg:gap-[0.694vw]">
            <Icon name="location" className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{a.label ?? "Area"}</span>
            <span className="ml-auto shrink-0 text-[13px] lg:text-[0.903vw] font-medium text-muted-foreground">
              {coverageBadge(a)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
