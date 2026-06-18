import type { JobDetail } from "@/lib/data/jobs";
import { formatCurrency } from "@/lib/format";
import { JobTimeline } from "./job-timeline";
import { URGENCY_LABEL } from "./board-meta";

/** Presentational body shared by the board's detail Sheet and the chat's detail Sheet. */
export function JobDetailContent({
  detail,
  showHomeowner = true,
  viewerRole = "contractor",
}: {
  detail: JobDetail;
  /** Show the homeowner's contact block. Gated behind engagement for contractors. */
  showHomeowner?: boolean;
  viewerRole?: "contractor" | "homeowner";
}) {
  const place = [detail.lead.city, detail.lead.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <Section title="Job">
        <Field label="Work" value={detail.lead.subtypes.join(", ") || detail.serviceName} />
        <Field label="Urgency" value={URGENCY_LABEL[detail.lead.urgency]} />
        <Field label="Location" value={detail.lead.address || place || detail.lead.zipCode || "—"} />
        {detail.lead.notes ? <Field label="Notes" value={detail.lead.notes} /> : null}
      </Section>

      {showHomeowner ? (
        <Section title="Homeowner">
          <Field label="Name" value={detail.homeowner.name ?? "—"} />
          <Field label="Phone" value={detail.homeowner.phone ?? "—"} />
          <Field label="Email" value={detail.homeowner.email} />
        </Section>
      ) : viewerRole === "contractor" ? (
        <Section title="Homeowner">
          <p className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] text-sm lg:text-[0.903vw] text-muted-foreground">
            Contact details unlock when you start the chat.
          </p>
        </Section>
      ) : null}

      {detail.latestQuote ? (
        <Section title="Latest quote">
          <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
            <span className="text-sm lg:text-[0.903vw] text-muted-foreground capitalize">
              {detail.latestQuote.status}
            </span>
            <span className="text-base lg:text-[1.111vw] font-semibold tabular-nums">
              {detail.latestQuote.total ? formatCurrency(detail.latestQuote.total) : "—"}
            </span>
          </div>
        </Section>
      ) : null}

      <Section title="Progress">
        <JobTimeline milestones={detail.milestones} viewerRole={viewerRole} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 lg:space-y-[0.833vw]">
      <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs lg:text-[0.764vw] text-muted-foreground">{label}</p>
      <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.903vw] text-foreground break-words">
        {value}
      </p>
    </div>
  );
}
