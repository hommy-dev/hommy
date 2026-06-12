import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getContractorProjects } from "@/lib/data/projects"
import { ProjectsList } from "@/components/dashboard/projects/projects-list"

export default async function ProjectsPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)

  if (!contractor) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your contractor profile isn’t set up yet.
      </p>
    )
  }

  const projects = await getContractorProjects(contractor.id)

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="w-full">
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Projects
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Your pipeline from engaged lead to completed job. Open one to message
          the homeowner and send a quote.
        </p>
      </header>

      <ProjectsList projects={projects} />
    </div>
  )
}
