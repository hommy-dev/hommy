import { cn } from "@/lib/utils"

// A titled settings block: optional heading + description, then a bordered
// card holding the controls. Flat (border, no shadow) per our design system.
export function SettingsSection({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: string
  description?: string
  /** Optional control rendered top-right of the heading row. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 lg:space-y-[1.111vw]">
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 lg:gap-[1.111vw]">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}

      <div
        className={cn(
          "rounded-md lg:rounded-[0.556vw] border border-border bg-card p-5 lg:p-[1.389vw]",
          className,
        )}
      >
        {children}
      </div>
    </section>
  )
}

// Row primitive for display-style settings (label · value · action), used by
// later sections (company, billing). Dividers come from a `divide-y` parent.
export function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 lg:gap-[0.556vw] py-4 lg:py-[1.111vw] first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm lg:text-[0.972vw] font-medium text-foreground">
          {label}
        </p>
        {description ? (
          <p className="mt-0.5 lg:mt-[0.139vw] text-[13px] lg:text-[0.903vw] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}
