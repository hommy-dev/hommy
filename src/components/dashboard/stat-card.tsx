import type { ComponentProps } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Card } from "@/components/ui/card"

type Hugeicon = NonNullable<ComponentProps<typeof HugeiconsIcon>["icon"]>

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: Hugeicon
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5" />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
