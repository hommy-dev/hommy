import { SVGIcon } from "@/components/ui/svg-icon"
import { cn } from "@/lib/utils"

/**
 * Names of the custom icon set living in /public/icons (one .svg each).
 * These are the platform's primary icons — prefer them over any icon library.
 * Add a new file to /public/icons and a matching name here to extend the set.
 */
export type IconName =
  | "activity"
  | "add-user"
  | "alarm"
  | "arrow-left"
  | "arrow-up"
  | "arrow-right"
  | "arrow-down"
  | "badge-check"
  | "bag"
  | "bag-3"
  | "bookmark"
  | "buy"
  | "calendar"
  | "call"
  | "call-missed"
  | "call-silent"
  | "calling"
  | "camera"
  | "category"
  | "chart"
  | "chat"
  | "close"
  | "close-square"
  | "down"
  | "up"
  | "left"
  | "right"
  | "globe"
  | "google"
  | "lightbulb"
  | "storm"
  | "wrench"
  | "danger-circle"
  | "danger-triangle"
  | "delete"
  | "discount"
  | "discovery"
  | "document"
  | "download"
  | "edit"
  | "edit-square"
  | "filter"
  | "filter-3"
  | "folder"
  | "game"
  | "graph"
  | "heart"
  | "hide"
  | "home"
  | "image"
  | "image-3"
  | "info-square"
  | "support"
  | "location"
  | "lock"
  | "login"
  | "logo"
  | "logout"
  | "message"
  | "more-circle"
  | "more-square"
  | "notification"
  | "open-panel-right"
  | "grip-vertical"
  | "paper"
  | "paper-download"
  | "paper-fail"
  | "paper-negative"
  | "paper-plus"
  | "paper-upload"
  | "password"
  | "play"
  | "plus"
  | "profile"
  | "scan"
  | "search"
  | "send"
  | "setting"
  | "shield-done"
  | "shield-fail"
  | "show"
  | "star"
  | "star-filled"
  | "swap"
  | "tick"
  | "tick-square"
  | "ticket"
  | "ticket-star"
  | "time-circle"
  | "time-square"
  | "unfold-morre"
  | "unlock"
  | "upload"
  | "user-2"
  | "user-3"
  | "video"
  | "voice"
  | "voice-3"
  | "volume-down"
  | "volume-off"
  | "volume-up"
  | "wallet"
  | "work"
  | "eye"
  // --- Pending: referenced in the UI but the SVG file is not in /public/icons yet ---
  | "sun" // theme: light
  | "moon" // theme: dark
  | "monitor" // theme: system
  | "scale" // admin: disputes (balance scale)

interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  name: IconName
  /** Keep the SVG's own colors instead of inheriting the current text color. */
  preserveColors?: boolean
}

/**
 * Renders a custom icon from /public/icons by name. Inherits the current text
 * color by default (mask mode), so size/color it with `text-*` and `size-*`.
 */
export function Icon({ name, className, preserveColors, ...props }: IconProps) {
  return (
    <SVGIcon
      src={`/icons/${name}.svg`}
      preserveColors={preserveColors}
      className={cn("size-5 lg:size-[1.389vw]", className)}
      {...props}
    />
  )
}
