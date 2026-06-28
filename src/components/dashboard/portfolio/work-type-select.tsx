"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

/**
 * A select-styled dropdown for a small fixed list (work type). Built on the
 * dropdown-menu so the trigger is fully ours to size — it matches the app Input
 * height/border exactly, so it sits flush beside text inputs (e.g. Location).
 */
export function WorkTypeSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select work type",
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-11 lg:h-[3.056vw] w-full items-center justify-between gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.972vw] outline-none transition-colors hover:border-foreground/30 focus-visible:border-ring data-[state=open]:border-ring",
          className,
        )}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <Icon
          name="down"
          className="size-4 lg:size-[1.111vw] shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((o) => (
          <DropdownMenuItem
            key={o}
            onSelect={() => onValueChange(o)}
            className="flex items-center justify-between"
          >
            {o}
            {o === value ? (
              <Icon name="tick" className="size-4 lg:size-[1.111vw] text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
