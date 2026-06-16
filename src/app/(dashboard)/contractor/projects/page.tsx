import { redirect } from "next/navigation"

// Projects merged into the unified Jobs board.
export default function ProjectsRedirect() {
  redirect("/contractor/jobs")
}
