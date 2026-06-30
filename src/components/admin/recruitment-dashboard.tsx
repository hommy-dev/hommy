"use client"

import type { ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/** Tab shell for the recruitment page. Tables are server-rendered and passed in as slots. */
export function RecruitmentTabs({
  prospects,
  demand,
  errors,
  counts,
}: {
  prospects: ReactNode
  demand: ReactNode
  errors: ReactNode
  counts: { prospects: number; demand: number; errors: number }
}) {
  return (
    <Tabs defaultValue="prospects">
      <TabsList>
        <TabsTrigger value="prospects">
          Prospects <Count n={counts.prospects} />
        </TabsTrigger>
        <TabsTrigger value="demand">
          Uncovered demand <Count n={counts.demand} />
        </TabsTrigger>
        <TabsTrigger value="errors">
          Errors <Count n={counts.errors} tone={counts.errors > 0 ? "bad" : "muted"} />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="prospects" className="pt-4 lg:pt-[1.111vw]">
        {prospects}
      </TabsContent>
      <TabsContent value="demand" className="pt-4 lg:pt-[1.111vw]">
        {demand}
      </TabsContent>
      <TabsContent value="errors" className="pt-4 lg:pt-[1.111vw]">
        {errors}
      </TabsContent>
    </Tabs>
  )
}

function Count({ n, tone = "muted" }: { n: number; tone?: "muted" | "bad" }) {
  return (
    <span
      className={cn(
        "ml-1 lg:ml-[0.278vw] rounded-full px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-[10px] lg:text-[0.694vw] font-semibold tabular-nums",
        tone === "bad" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
      )}
    >
      {n}
    </span>
  )
}
