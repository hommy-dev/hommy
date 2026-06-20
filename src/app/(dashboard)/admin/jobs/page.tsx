import { getRequiredUser } from "@/lib/auth/session"
import { getAdminJobs } from "@/lib/data/admin"
import { AdminJobsTable } from "@/components/admin/jobs-table"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminJobsPage() {
  await getRequiredUser("admin")
  const jobs = await getAdminJobs()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Jobs</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Active and completed jobs across all companies.
        </p>
      </header>

      {jobs.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No jobs yet"
          description="Once contractors engage leads, their jobs will show up here."
        />
      ) : (
        <AdminJobsTable jobs={jobs} />
      )}
    </div>
  )
}
