import Link from "next/link";
import type { ProjectListItem } from "@/lib/data/projects";
import { formatDistanceToNow, formatCurrency } from "@/lib/format";
import { StageBadge } from "./stage-badge";

/** Presentational projects table — each row links to the project workspace. */
export function ProjectsList({ projects }: { projects: ProjectListItem[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
        No projects yet. Engage a lead to start one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
      <table className="w-full min-w-[44rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
            <Th className="pl-4 lg:pl-[1.111vw]">Homeowner</Th>
            <Th>Work</Th>
            <Th>Location</Th>
            <Th>Stage</Th>
            <Th>Latest quote</Th>
            <th className="px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] pr-4 lg:pr-[1.111vw] text-right font-medium">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p) => (
            <tr key={p.id} className="group text-sm lg:text-[0.903vw] transition-colors hover:bg-muted/40">
              <td className="py-3 lg:py-[0.833vw] pl-4 lg:pl-[1.111vw] align-middle">
                <Link href={`/contractor/projects/${p.id}`} className="font-medium text-foreground hover:underline">
                  {p.homeownerName ?? "Homeowner"}
                </Link>
              </td>
              <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
                {p.subtype ?? p.serviceName}
              </td>
              <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
                {[p.city, p.state].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
                <StageBadge stage={p.stage} />
              </td>
              <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle tabular-nums text-foreground">
                {p.latestQuoteTotal ? formatCurrency(p.latestQuoteTotal) : "—"}
              </td>
              <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] pr-4 lg:pr-[1.111vw] align-middle text-right whitespace-nowrap text-muted-foreground">
                {formatDistanceToNow(new Date(p.stageUpdatedAt))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] font-medium ${className ?? ""}`}>{children}</th>;
}
