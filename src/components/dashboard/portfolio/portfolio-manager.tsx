"use client"

import { useState } from "react"
import type { PortfolioProject } from "@/lib/data/portfolio"
import { AddCaseStudyDialog } from "./add-case-study-dialog"
import { ManageCaseStudyDialog } from "./manage-case-study-dialog"

export function PortfolioManager({
  initial,
  cap,
  subtypes,
}: {
  initial: PortfolioProject[]
  cap: number | null
  subtypes: string[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const atCap = cap !== null && initial.length >= cap
  const openProject = initial.find((p) => p.id === openId) ?? null

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
          {initial.length}
          {cap !== null ? ` of ${cap}` : ""} case stud
          {initial.length === 1 && cap === null ? "y" : "ies"}
        </p>
        {atCap ? (
          <span className="text-xs lg:text-[0.833vw] text-muted-foreground">
            Plan limit reached — upgrade to add more.
          </span>
        ) : (
          <AddCaseStudyDialog subtypes={subtypes} />
        )}
      </div>

      {initial.length === 0 ? (
        <p className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border px-4 lg:px-[1.111vw] py-8 lg:py-[2.222vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No work added yet. Add a case study to show off completed jobs.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:gap-[0.833vw] sm:grid-cols-3">
          {initial.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenId(p.id)}
              className="group overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border text-left transition-colors hover:border-foreground/30"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {p.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImageUrl}
                    alt=""
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-xs lg:text-[0.833vw] text-muted-foreground">
                    No cover
                  </div>
                )}
              </div>
              <div className="p-2.5 lg:p-[0.694vw]">
                <p className="truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
                  {p.title}
                </p>
                <p className="text-xs lg:text-[0.833vw] text-muted-foreground">
                  {p.images.length} photo{p.images.length === 1 ? "" : "s"} ·{" "}
                  {p.isPublished ? "Published" : "Draft"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {openProject ? (
        <ManageCaseStudyDialog
          key={openProject.id}
          project={openProject}
          subtypes={subtypes}
          open
          onOpenChange={(o) => {
            if (!o) setOpenId(null)
          }}
        />
      ) : null}
    </div>
  )
}
