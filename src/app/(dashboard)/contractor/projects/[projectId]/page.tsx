import { redirect } from "next/navigation"

// The per-project workspace is now the chat control room. Old deep links land on
// the unified Jobs board.
export default async function ProjectDetailRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  await params
  redirect("/contractor/jobs")
}
