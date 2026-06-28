import * as React from "react"

import { cn } from "@/lib/utils"
import { Icon, type IconName } from "@/components/ui/icon"

/**
 * Shared empty / error states.
 *
 * Use these instead of hand-rolling a `border-dashed` div every time a list,
 * table, sheet, or section has nothing to show. They consolidate the pattern
 * first established on the homeowner jobs page (centered dashed card, sebenta
 * heading, muted description, optional CTA) so every empty/error surface looks
 * and behaves the same.
 *
 *   <EmptyState
 *     icon="paper"
 *     title="No jobs yet"
 *     description="Post your first project and start receiving quotes."
 *     action={
 *       <Button asChild size="lg">
 *         <Link href="/get-a-quote"><Icon name="plus" />Post first job</Link>
 *       </Button>
 *     }
 *   />
 *
 *   <ErrorState description="This job is no longer available." />
 */

type StateSize = "default" | "sm"

const SIZE: Record<
  StateSize,
  { wrap: string; iconWrap: string; icon: string; title: string; gapTop: string }
> = {
  default: {
    wrap: "min-h-[50vh] p-8 lg:p-[2.222vw]",
    iconWrap: "size-12 lg:size-[3.333vw] mb-4 lg:mb-[1.111vw]",
    icon: "size-6 lg:size-[1.667vw]",
    title: "text-lg lg:text-[1.5vw]",
    gapTop: "mt-5 lg:mt-[1.389vw]",
  },
  sm: {
    wrap: "p-8 lg:p-[2.222vw]",
    iconWrap: "size-10 lg:size-[2.778vw] mb-3 lg:mb-[0.833vw]",
    icon: "size-5 lg:size-[1.389vw]",
    title: "text-base lg:text-[1.111vw]",
    gapTop: "mt-4 lg:mt-[1.111vw]",
  },
}

interface StateViewProps {
  /** Optional icon shown in a soft circle above the title. */
  icon?: IconName
  /** Short, plain-language headline. */
  title: string
  /** Supporting line explaining what to do next. */
  description?: string
  /** A CTA (usually a <Button>) rendered below the copy. */
  action?: React.ReactNode
  /** `default` = full-page/section; `sm` = inline inside a table, sheet, or card. */
  size?: StateSize
  /**
   * Dashed card around the content. Default true. Turn off for places that own
   * their own framing (a messaging panel, a borderless profile section) so the
   * state sits cleanly without a nested box.
   */
  bordered?: boolean
  className?: string
}

function StateView({
  icon,
  iconClassName,
  title,
  description,
  action,
  size = "default",
  bordered = true,
  className,
}: StateViewProps & { iconClassName?: string }) {
  const s = SIZE[size]
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        bordered &&
          "rounded-md lg:rounded-[0.8vw] border border-dashed border-border",
        s.wrap,
        className
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            s.iconWrap,
            iconClassName
          )}
        >
          <Icon name={icon} className={s.icon} />
        </span>
      )}
      <h2 className={cn("font-sebenta font-semibold", s.title)}>{title}</h2>
      {description && (
        <p className="text-balance mt-1 lg:mt-[0.278vw] max-w-sm lg:max-w-[26.664vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className={s.gapTop}>{action}</div>}
    </div>
  )
}

/** Nothing-here state: empty lists, tables, sections. */
export function EmptyState(props: StateViewProps) {
  return <StateView {...props} />
}

interface ErrorStateProps extends Omit<StateViewProps, "icon" | "title"> {
  /** Defaults to "Something went wrong". */
  title?: string
  icon?: IconName
}

/**
 * Failed-to-load / unavailable state. Same shape as EmptyState but tinted with
 * a danger icon. Pass an `action` (e.g. a "Try again" Button) when retry is
 * possible.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  icon = "danger-triangle",
  size = "sm",
  ...rest
}: ErrorStateProps) {
  return (
    <StateView
      {...rest}
      icon={icon}
      iconClassName="bg-destructive/10 text-destructive"
      title={title}
      description={description}
      size={size}
    />
  )
}
