import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { STEP_LABELS, type StepKey } from "./constants"

// Step heading + subtitle + a spaced column for the step's fields.
export function WizardStep({
  title,
  sub,
  children,
}: {
  title: string
  sub: string
  children: React.ReactNode
}) {
  return (
    <div> 
      <h1 className="font-sebenta text-[2rem] lg:text-[1.8vw] font-bold leading-tight tracking-tight">
        {title}
      </h1>
      <p className="mt-2 lg:mt-[0.3vw] text-[15px] lg:text-[1.042vw] text-foreground/60">
        {sub}
      </p>
      <div className="mt-6 lg:mt-[2vw] space-y-5 lg:space-y-[2vw]">
        {children}
      </div>
    </div>
  )
}

// Label (+ optional hint) over a control, with an optional error line below.
export function WizardField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 lg:space-y-[0.7vw]">
      <Label className="lg:text-[1.1vw] font-medium text-foreground/80">
        {label}
      </Label>
      {hint ? (
        <p className="-mt-0.5 lg:-mt-[0.139vw] text-xs lg:text-[0.833vw] text-foreground/50">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs lg:text-[0.833vw] text-destructive">{error}</p>
      ) : null}
    </div>
  )
}

export function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Discrete, labelled step indicator — no percentage, no loading bar. Completed
// steps show a check, the current step is filled, upcoming steps stay muted.
export function Stepper({
  steps,
  currentIndex,
}: {
  steps: StepKey[]
  currentIndex: number
}) {
  return (
    <ol className="flex items-center justify-center">
      {steps.map((key, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <li key={key} className="flex items-center">
            <span
              className={cn(
                "flex size-6 lg:size-[1.667vw] shrink-0 items-center justify-center rounded-full border text-[11px] lg:text-[0.764vw] font-semibold transition-colors",
                active && "border-foreground bg-foreground text-background",
                done && "border-secondary bg-secondary text-secondary-foreground",
                !active && !done && "border-border text-foreground/40",
              )}
            >
              {done ? <Check /> : i + 1}
            </span>
            <span
              className={cn(
                "ml-2 lg:ml-[0.556vw] hidden text-xs lg:text-[0.833vw] font-medium transition-colors sm:inline",
                active ? "text-foreground" : "text-foreground/45",
              )}
            >
              {STEP_LABELS[key]}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-3 lg:mx-[0.833vw] h-px lg:h-[0.069vw] w-8 lg:w-[2.222vw] bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
