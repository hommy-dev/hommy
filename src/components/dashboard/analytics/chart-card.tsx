import { cn } from "@/lib/utils"

/** Consistent card shell for every analytics chart: title + a one-line purpose,
 *  an optional right slot (legend/range), and a built-in empty state. */
export function ChartCard({
  title,
  purpose,
  right,
  empty,
  emptyText,
  className,
  children,
}: {
  title: string
  purpose?: string
  right?: React.ReactNode
  empty?: boolean
  emptyText?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("homei-rise flex flex-col rounded-xl lg:rounded-[0.833vw] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]", className)}>
      <header className="flex items-start justify-between gap-3 lg:gap-[0.833vw] px-5 lg:px-[1.389vw] pt-5 lg:pt-[1.389vw] pb-4 lg:pb-[1.111vw]">
        <div className="min-w-0">
          <h3 className="text-sm lg:text-[0.972vw] font-semibold">{title}</h3>
          {purpose ? <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.833vw] text-muted-foreground">{purpose}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      <div className="flex flex-1 flex-col px-5 lg:px-[1.389vw] pb-5 lg:pb-[1.389vw]">
        {empty ? (
          <div className="flex flex-1 items-center justify-center py-8 lg:py-[2.222vw]">
            <p className="max-w-xs lg:max-w-[18vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
