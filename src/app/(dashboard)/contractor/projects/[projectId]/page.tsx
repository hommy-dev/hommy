import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getProjectForContractor } from "@/lib/data/projects"
import { StageBadge } from "@/components/dashboard/projects/stage-badge"
import { ProjectStageActions } from "@/components/dashboard/projects/project-stage-actions"
import { EstimateList } from "@/components/dashboard/estimates/estimate-list"
import { QuoteBuilderDialog } from "@/components/dashboard/estimates/quote-builder-dialog"

const URGENCY: Record<string, string> = {
  emergency: "Emergency",
  within_week: "This week",
  within_month: "This month",
  planning: "Planning",
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  if (!contractor) notFound()

  const project = await getProjectForContractor(projectId, contractor.id)
  if (!project) notFound()

  const place = [project.lead?.city, project.lead?.state].filter(Boolean).join(", ")

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <div>
        <Link
          href="/contractor/projects"
          className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.903vw] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Projects
        </Link>
        <div className="mt-2 lg:mt-[0.556vw] flex flex-wrap items-center justify-between gap-3 lg:gap-[0.833vw]">
          <div className="flex items-center gap-3 lg:gap-[0.833vw]">
            <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
              {project.homeowner.name ?? "Homeowner"}
            </h1>
            <StageBadge stage={project.stage} />
          </div>
          <div className="flex items-center gap-2 lg:gap-[0.556vw]">
            {project.conversationId ? (
              <Link
                href={`/contractor/messages/${project.conversationId}`}
                className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] border border-border bg-card px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium transition-colors hover:bg-muted"
              >
                <MessageSquare className="size-4 lg:size-[1.111vw]" strokeWidth={2} /> Message
              </Link>
            ) : null}
            <ProjectStageActions projectId={project.id} stage={project.stage} />
            <QuoteBuilderDialog projectId={project.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:gap-[1.111vw] lg:grid-cols-3">
        {/* Job + contact */}
        <div className="space-y-4 lg:space-y-[1.111vw] lg:col-span-1">
          <Card title="Job details">
            <Field label="Service" value={project.lead?.subtypes.join(", ") || "—"} />
            <Field label="Urgency" value={project.lead ? URGENCY[project.lead.urgency ?? ""] ?? "—" : "—"} />
            <Field label="Location" value={project.lead?.address || place || "—"} />
            {project.lead?.notes ? <Field label="Notes" value={project.lead.notes} /> : null}
          </Card>
          <Card title="Homeowner">
            <Field label="Name" value={project.homeowner.name ?? "—"} />
            <Field label="Phone" value={project.homeowner.phone ?? "—"} />
            <Field label="Email" value={project.homeowner.email} />
          </Card>
        </div>

        {/* Quotes */}
        <div className="lg:col-span-2">
          <Card title="Quotes">
            <EstimateList estimates={project.estimates} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-4 lg:p-[1.111vw]">
      <h2 className="mb-3 lg:mb-[0.833vw] text-sm lg:text-[0.903vw] font-semibold">{title}</h2>
      <div className="space-y-3 lg:space-y-[0.833vw]">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.903vw] text-foreground break-words">{value}</p>
    </div>
  )
}
