import { Icon } from "@/components/ui/icon";
import { ImageZoom } from "@/components/kibo-ui/image-zoom";
import type { JobDetail } from "@/lib/data/jobs";
import { formatCurrency } from "@/lib/format";
import { RatingBadge } from "@/components/contractors/rating-badge";
import { ContractorProfileDialog } from "@/components/contractors/contractor-profile-dialog";
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
        {detail.lead.photos.length > 0 ? (
          <PhotoGallery photos={detail.lead.photos} />
        ) : null}
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

      {viewerRole === "homeowner" ? (
        <Section title="Your contractor">
          <div className="flex items-start justify-between gap-3 lg:gap-[0.833vw]">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 lg:gap-[0.417vw] font-medium lg:text-[0.972vw]">
                <span className="truncate">{detail.contractor.companyName ?? "Contractor"}</span>
                {detail.contractor.verified ? (
                  <Icon name="badge-check" className="size-4 lg:size-[1.111vw] shrink-0 text-success" aria-label="Verified" />
                ) : null}
              </p>
              <div className="mt-1 lg:mt-[0.278vw]">
                <RatingBadge avgRating={detail.contractor.avgRating} totalReviews={detail.contractor.totalReviews} />
              </div>
              {detail.contractor.yearsInBusiness ? (
                <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                  {detail.contractor.yearsInBusiness} year{detail.contractor.yearsInBusiness === 1 ? "" : "s"} in business
                </p>
              ) : null}
            </div>
            <ContractorProfileDialog
              contractorId={detail.contractor.id}
              contractorName={detail.contractor.companyName}
            />
          </div>
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

function PhotoGallery({ photos }: { photos: string[] }) {
  return (
    <div>
      <p className="text-xs lg:text-[0.764vw] text-muted-foreground">
        Photos
      </p>
      <div className="mt-1.5 lg:mt-[0.417vw] grid grid-cols-3 gap-2 lg:gap-[0.556vw] sm:grid-cols-4">
        {photos.map((url, i) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border"
          >
            <ImageZoom className="size-full [&_[data-rmiz-content]]:block [&_[data-rmiz-content]]:size-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Job photo ${i + 1}`}
                loading="lazy"
                className="size-full object-cover"
              />
            </ImageZoom>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              aria-label={`Download photo ${i + 1}`}
              className="absolute right-1.5 top-1.5 lg:right-[0.417vw] lg:top-[0.417vw] z-10 grid size-7 lg:size-[1.944vw] place-items-center rounded-full bg-foreground/60 text-background opacity-0 backdrop-blur-sm transition-opacity hover:bg-foreground/80 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Icon name="download" className="size-3.5 lg:size-[0.972vw]" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
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
