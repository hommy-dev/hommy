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
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl",
              tint ?? "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-sebenta text-[1.75rem] font-bold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
