import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  icon,
  tint,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tint?: string
}) {
  return (
    <div className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <div className="flex items-start justify-between gap-3 lg:gap-[0.833vw]">
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex size-9 lg:size-[2.5vw] items-center justify-center rounded-xl lg:rounded-[0.926vw]",
              tint ?? "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 lg:mt-[0.833vw] font-sebenta text-[1.75rem] lg:text-[1.944vw] font-bold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 lg:mt-[0.556vw] text-xs lg:text-[0.833vw] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
