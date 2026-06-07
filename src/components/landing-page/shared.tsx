import Image from "next/image"
import { cn } from "@/lib/utils"

// Image slot for the landing page. Pass `src` to drop in the relevant photo —
// just update the path anywhere it's used. Falls back to a generic shot.
export function LandingImage({
  src = "/bg/worker-1.jpeg",
  alt = "Roofer at work",
  className,
}: {
  src?: string
  alt?: string
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  )
}

// Small lime-dot eyebrow used to label sections.
export function Eyebrow({
  children,
  className,
  dot = "bg-secondary",
}: {
  children: React.ReactNode
  className?: string
  dot?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 lg:gap-[0.556vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-[0.16em] text-foreground/45",
        className,
      )}
    >
      <span className={cn("size-1.5 lg:size-[0.417vw] rounded-full", dot)} />
      {children}
    </span>
  )
}

export function SectionHead({
  title,
  sub,
  className,
}: {
  eyebrow: string
  title: string
  sub?: string
  className?: string
}) {
  return (
    <div className={cn("max-w-2xl lg:max-w-[46.662vw]", className)}>
      <h2 className="mt-4 lg:mt-[1.111vw] font-sebenta text-[2rem] lg:text-[2.222vw] font-bold leading-[1.06] tracking-tight sm:text-[2.6rem]">
        {title}
      </h2>
      {sub ? (
        <p className="mt-4 lg:mt-[1.111vw] text-[17px] lg:text-[1.181vw] leading-relaxed text-foreground/60">{sub}</p>
      ) : null}
    </div>
  )
}

// A small tag/pill.
export function Pill({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  )
}

// Intentional placeholder for an image/video the operator will drop in later.
// Looks like a deliberate slot (dashed frame + label), never a broken box.
export function AssetPlaceholder({
  label = "Image",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-md lg:rounded-[0.556vw] border border-dashed bg-muted/70",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 lg:gap-[0.556vw] px-4 lg:px-[1.111vw] text-center text-foreground/35">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="text-[11px] lg:text-[0.764vw] font-medium uppercase tracking-wider">{label}</span>
      </div>
    </div>
  )
}

export function Stars({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5 lg:gap-[0.139vw] text-amber-400", className)} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 1l1.7 3.6 3.9.5-2.9 2.7.7 3.9L7 9.9 3.6 11.7l.7-3.9L1.4 5.1l3.9-.5L7 1z" />
        </svg>
      ))}
    </span>
  )
}

export function Check({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3 8h9m0 0l-3.5-3.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
