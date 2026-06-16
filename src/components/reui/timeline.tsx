"use client"

import {
  createContext,
  HTMLAttributes,
  useCallback,
  useContext,
  useState,
} from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Types
type TimelineContextValue = {
  activeStep: number
  setActiveStep: (step: number) => void
}

// Context
const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined
)

const useTimeline = () => {
  const context = useContext(TimelineContext)
  if (!context) {
    throw new Error("useTimeline must be used within a Timeline")
  }
  return context
}

// Components
interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: number
  value?: number
  onValueChange?: (value: number) => void
  orientation?: "horizontal" | "vertical"
}

function Timeline({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "vertical",
  className,
  children,
  ...props
}: TimelineProps) {
  const [activeStep, setInternalStep] = useState(defaultValue)

  const setActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setInternalStep(step)
      }
      onValueChange?.(step)
    },
    [value, onValueChange]
  )

  const currentStep = value ?? activeStep

  return (
    <TimelineContext.Provider
      value={{ activeStep: currentStep, setActiveStep }}
    >
      <div
        className={cn(
          "group/timeline flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
          className
        )}
        data-orientation={orientation}
        data-slot="timeline"
        {...props}
      >
        {children}
      </div>
    </TimelineContext.Provider>
  )
}

// TimelineContent
function TimelineContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="timeline-content"
      {...props}
    />
  )
}

// TimelineDate
interface TimelineDateProps extends HTMLAttributes<HTMLTimeElement> {
  asChild?: boolean
}

function TimelineDate({
  asChild = false,
  className,
  ...props
}: TimelineDateProps) {
  const Comp = asChild ? Slot.Root : "time"

  return (
    <Comp
      className={cn(
        "text-muted-foreground mb-1 block text-xs font-medium group-data-[orientation=vertical]/timeline:max-sm:h-4",
        className
      )}
      data-slot="timeline-date"
      {...props}
    />
  )
}

// TimelineHeader
function TimelineHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} data-slot="timeline-header" {...props} />
  )
}

// TimelineIndicator
interface TimelineIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

function TimelineIndicator({
  asChild = false,
  className,
  children,
  ...props
}: TimelineIndicatorProps) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      aria-hidden="true"
      className={cn(
        "border-primary/20 group-data-completed/timeline-item:border-primary absolute size-4 rounded-full border-2 group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:left-0 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:top-0 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2",
        className
      )}
      data-slot="timeline-indicator"
      {...props}
    >
      {children}
    </Comp>
  )
}

// TimelineItem
interface TimelineItemProps extends HTMLAttributes<HTMLDivElement> {
  step: number
}

function TimelineItem({ step, className, ...props }: TimelineItemProps) {
  const { activeStep } = useTimeline()

  return (
    <div
      className={cn(
        "group/timeline-item has-[+[data-completed]]:**:data-[slot=timeline-separator]:bg-primary relative flex flex-1 flex-col gap-0.5 group-data-[orientation=horizontal]/timeline:mt-8 group-data-[orientation=horizontal]/timeline:not-last:pe-8 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=vertical]/timeline:not-last:pb-6",
        className
      )}
      data-completed={step <= activeStep || undefined}
      data-slot="timeline-item"
      {...props}
    />
  )
}

// TimelineSeparator
function TimelineSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-primary/10 absolute self-start group-last/timeline-item:hidden group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:h-0.5 group-data-[orientation=horizontal]/timeline:w-[calc(100%-1rem-0.25rem)] group-data-[orientation=horizontal]/timeline:translate-x-4.5 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-1rem-0.25rem)] group-data-[orientation=vertical]/timeline:w-0.5 group-data-[orientation=vertical]/timeline:-translate-x-1/2 group-data-[orientation=vertical]/timeline:translate-y-4.5",
        className
      )}
      data-slot="timeline-separator"
      {...props}
    />
  )
}

// TimelineTitle
function TimelineTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-medium", className)}
      data-slot="timeline-title"
      {...props}
    />
  )
}

export {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
}








// ---
// title: Timeline
// description: A visual representation of events in chronological order.
// component: true
// base: radix
// ---

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-1"
//   className="**:[.preview]:h-auto"
// />

// ## Examples

// ### With Left-Aligned Dates

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-2"
//   className="**:[.preview]:h-auto"
// />

// ### With Custom Indicators

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-3"
//   className="**:[.preview]:h-auto"
// />

// ### With Icons

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-4"
//   className="**:[.preview]:h-auto"
// />

// ### Alternating Layout

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-5"
//   className="**:[.preview]:h-auto"
// />

// ### Pipeline Steps

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-6"
//   className="**:[.preview]:h-auto"
// />

// ### Dot Indicators

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-7"
//   className="**:[.preview]:h-auto"
// />

// ### Horizontal Orientation

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-8"
//   className="**:[.preview]:h-auto"
// />

// ### Horizontal with Top Indicators

// <ComponentPreview
//   styleName="radix-nova"
//   name="c-timeline-9"
//   className="**:[.preview]:h-auto"
// />

// ## Installation

// <CodeTabs>

// <TabsList>
//   <TabsTrigger value="cli">CLI</TabsTrigger>
//   <TabsTrigger value="manual">Manual</TabsTrigger>
// </TabsList>

// <TabsContent value="cli">

// ```bash
// npx shadcn@latest add @reui/r-timeline
// ```

// </TabsContent>

// <TabsContent value="manual">

// <Steps>

// <Step>Install the following dependencies:</Step>

// ```bash
// npm install radix-ui
// ```

// <Step>Copy and paste the following code into your project.</Step>

// <ComponentSource
//   styleName="radix-nova"
//   name="timeline"
//   title="components/reui/timeline.tsx"
// />

// </Steps>

// </TabsContent>

// </CodeTabs>

// ## Usage

// ```tsx
// import {
//   Timeline,
//   TimelineContent,
//   TimelineDate,
//   TimelineHeader,
//   TimelineIndicator,
//   TimelineItem,
//   TimelineSeparator,
//   TimelineTitle,
// } from "@/components/reui/r-timeline"
// ```

// ```tsx
// <Timeline>
//   <TimelineItem step={1}>
//     <TimelineHeader>
//       <TimelineDate>March 2024</TimelineDate>
//       <TimelineTitle>Project Initialized</TimelineTitle>
//     </TimelineHeader>
//     <TimelineIndicator />
//     <TimelineSeparator />
//     <TimelineContent>
//       Successfully set up the project repository and initial architecture.
//     </TimelineContent>
//   </TimelineItem>
// </Timeline>
// ```

// ## API Reference

// ### Timeline

// The root component for the timeline.

// | Prop            | Type                         | Default      | Description                                  |
// | :-------------- | :--------------------------- | :----------- | :------------------------------------------- |
// | `defaultValue`  | `number`                     | `1`          | The initial active step.                     |
// | `value`         | `number`                     | -            | The current active step (controlled).        |
// | `onValueChange` | `(value: number) => void`    | -            | Callback fired when the active step changes. |
// | `orientation`   | `"horizontal" \| "vertical"` | `"vertical"` | The layout orientation of the timeline.      |

// ### TimelineItem

// A single item in the timeline.

// | Prop   | Type     | Default | Description                                  |
// | :----- | :------- | :------ | :------------------------------------------- |
// | `step` | `number` | -       | **Required**. The step number for this item. |

// ### TimelineDate

// The date or time label for a timeline item.

// | Prop        | Type     | Default | Description                                |
// | :---------- | :------- | :------ | :----------------------------------------- |
// | `className` | `string` | -       | Additional CSS classes for the date label. |

// ### TimelineTitle

// The title for a timeline item.

// | Prop        | Type     | Default | Description                           |
// | :---------- | :------- | :------ | :------------------------------------ |
// | `className` | `string` | -       | Additional CSS classes for the title. |

// ### TimelineIndicator

// The visual indicator (usually a dot) for a timeline item.

// | Prop        | Type     | Default | Description                               |
// | :---------- | :------- | :------ | :---------------------------------------- |
// | `className` | `string` | -       | Additional CSS classes for the indicator. |

// ### TimelineSeparator

// The line connecting timeline indicators.

// | Prop        | Type     | Default | Description                                    |
// | :---------- | :------- | :------ | :--------------------------------------------- |
// | `className` | `string` | -       | Additional CSS classes for the separator line. |

// ### TimelineHeader

// A container for the date and title.

// | Prop        | Type     | Default | Description                                      |
// | :---------- | :------- | :------ | :----------------------------------------------- |
// | `className` | `string` | -       | Additional CSS classes for the header container. |

// ### TimelineContent

// The main descriptive content for a timeline item.

// | Prop        | Type     | Default | Description                                       |
// | :---------- | :------- | :------ | :------------------------------------------------ |
// | `className` | `string` | -       | Additional CSS classes for the content container. |
