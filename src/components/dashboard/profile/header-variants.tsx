import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

// ── Shared shape + sample data ──────────────────────────────────────────────

export type HeaderStat = {
  label: string
  value: string
  star?: boolean
  accent?: boolean
}

export type HeaderData = {
  name: string
  verified: boolean
  logoUrl: string | null
  bannerUrl: string | null
  metaLine: string
  stats: HeaderStat[]
  canManage: boolean
}

export const HEADER_SAMPLE: HeaderData = {
  name: "Lone Star Roofing Co.",
  verified: true,
  logoUrl: null,
  bannerUrl: null,
  metaLine: "Roofing · 8 years in business · Dallas, TX",
  stats: [
    { label: "Rating", value: "4.8", star: true },
    { label: "Reviews", value: "23" },
    { label: "Years in business", value: "8" },
    { label: "Jobs won", value: "47" },
    { label: "Top-rated", value: "120", accent: true },
  ],
  canManage: true,
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return "?"
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function Banner({ url, className }: { url: string | null; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <>
          <div className="size-full bg-gradient-to-tr from-primary/30 via-primary/15 to-secondary/25" />
          <div className="absolute inset-0 bg-[radial-gradient(80%_140%_at_85%_-20%,rgba(255,255,255,0.4),transparent_60%)]" />
        </>
      )}
    </div>
  )
}

function VerifiedDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
      title="Verified company"
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-[60%]">
        <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function VerifiedPill() {
  return (
    <span className="inline-flex items-center gap-1 lg:gap-[0.278vw] rounded-full bg-secondary px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-semibold text-secondary-foreground">
      <Icon name="shield-done" className="size-3.5 lg:size-[0.972vw]" />
      Verified
    </span>
  )
}

function EditButton({ glass }: { glass?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 lg:gap-[0.417vw] rounded-full px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium transition-colors",
        glass
          ? "border border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25"
          : "border border-border bg-card text-foreground hover:bg-muted/60",
      )}
    >
      <Icon name="edit" className="size-4 lg:size-[1.111vw]" />
      Edit profile
    </span>
  )
}

// ── Variant 1 — Unified card overlapping the banner, stats embedded ──────────

export function HeaderVariantCard({ data }: { data: HeaderData }) {
  return (
    <div>
      <Banner url={data.bannerUrl} className="h-28 lg:h-[9vw] w-full rounded-xl lg:rounded-[1vw]" />
      <div className="relative mx-3 lg:mx-[0.833vw] -mt-10 lg:-mt-[3vw] rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-5 lg:p-[1.389vw] shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
        <div className="flex flex-col gap-4 lg:gap-[1.111vw] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 lg:gap-[1.111vw]">
            <span className="relative -mt-12 lg:-mt-[5vw] flex size-20 lg:size-[5.5vw] shrink-0 items-center justify-center rounded-2xl lg:rounded-[1.111vw] bg-muted text-xl lg:text-[1.667vw] font-semibold text-foreground/70 ring-4 lg:ring-[0.278vw] ring-card">
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} alt="" className="size-full rounded-2xl lg:rounded-[1.111vw] object-cover" />
              ) : (
                initials(data.name)
              )}
              {data.verified ? (
                <VerifiedDot className="absolute -bottom-1 -right-1 lg:-bottom-[0.278vw] lg:-right-[0.278vw] size-6 lg:size-[1.667vw] ring-2 lg:ring-[0.139vw] ring-card" />
              ) : null}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
                <h1 className="font-sebenta text-xl lg:text-[1.667vw] font-bold tracking-tight">{data.name}</h1>
                {data.verified ? <VerifiedPill /> : null}
              </div>
              <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">{data.metaLine}</p>
            </div>
          </div>
          {data.canManage ? <EditButton /> : null}
        </div>

        <dl className="mt-5 lg:mt-[1.389vw] grid grid-cols-2 gap-y-4 lg:gap-y-[1.111vw] border-t border-border pt-5 lg:pt-[1.389vw] sm:grid-cols-5">
          {data.stats.map((s) => (
            <div key={s.label} className="sm:border-l sm:border-border sm:pl-4 lg:sm:pl-[1.111vw] sm:first:border-l-0 sm:first:pl-0">
              <dd className="flex items-center gap-1 lg:gap-[0.278vw]">
                {s.star ? <Icon name="star" className="size-4 lg:size-[1.25vw] text-amber-400" /> : null}
                <span className={cn("text-xl lg:text-[1.667vw] font-bold tabular-nums leading-none", s.accent ? "text-primary" : "text-foreground")}>
                  {s.value}
                </span>
              </dd>
              <dt className="mt-1 lg:mt-[0.278vw] line-clamp-1 text-xs lg:text-[0.764vw] text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

// ── Variant 2 — Compact, no big banner, inline stat row ──────────────────────

export function HeaderVariantCompact({ data }: { data: HeaderData }) {
  return (
    <div className="overflow-hidden rounded-2xl lg:rounded-[1.111vw] border border-border bg-card">
      <div className="h-1.5 lg:h-[0.417vw] w-full bg-gradient-to-r from-primary via-primary/60 to-secondary" />
      <div className="p-5 lg:p-[1.389vw]">
        <div className="flex flex-col gap-4 lg:gap-[1.111vw] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 lg:gap-[1.111vw]">
            <span className="relative flex size-16 lg:size-[4.5vw] shrink-0 items-center justify-center rounded-xl lg:rounded-[0.833vw] bg-muted text-lg lg:text-[1.5vw] font-semibold text-foreground/70">
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} alt="" className="size-full rounded-xl lg:rounded-[0.833vw] object-cover" />
              ) : (
                initials(data.name)
              )}
              {data.verified ? (
                <VerifiedDot className="absolute -bottom-1 -right-1 lg:-bottom-[0.278vw] lg:-right-[0.278vw] size-5 lg:size-[1.39vw] ring-2 lg:ring-[0.139vw] ring-card" />
              ) : null}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
                <h1 className="font-sebenta text-xl lg:text-[1.667vw] font-bold tracking-tight">{data.name}</h1>
                {data.verified ? <VerifiedPill /> : null}
              </div>
              <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">{data.metaLine}</p>
            </div>
          </div>
          {data.canManage ? <EditButton /> : null}
        </div>

        <div className="mt-4 lg:mt-[1.111vw] flex flex-wrap items-center gap-x-6 lg:gap-x-[1.667vw] gap-y-2 lg:gap-y-[0.556vw] border-t border-border pt-4 lg:pt-[1.111vw] text-sm lg:text-[0.972vw]">
          {data.stats.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 lg:gap-[0.417vw]">
              {s.star ? <Icon name="star" className="size-4 lg:size-[1.111vw] text-amber-400" /> : null}
              <span className={cn("font-bold tabular-nums", s.accent ? "text-primary" : "text-foreground")}>{s.value}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Variant 3 — Bold gradient banner, white overlay identity + glass chips ───

export function HeaderVariantImmersive({ data }: { data: HeaderData }) {
  return (
    <div className="relative h-60 lg:h-[20vw] w-full overflow-hidden rounded-2xl lg:rounded-[1.111vw]">
      <Banner url={data.bannerUrl} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/35" />

      {/* Top row: identity + edit */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 lg:gap-[1.111vw] p-5 lg:p-[1.389vw]">
        <div className="flex items-center gap-4 lg:gap-[1.111vw]">
          <span className="relative flex size-16 lg:size-[4.5vw] shrink-0 items-center justify-center rounded-2xl lg:rounded-[1.111vw] bg-white text-lg lg:text-[1.5vw] font-semibold text-foreground ring-1 ring-white/40">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt="" className="size-full rounded-2xl lg:rounded-[1.111vw] object-cover" />
            ) : (
              initials(data.name)
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
              <h1 className="font-sebenta text-xl lg:text-[1.667vw] font-bold tracking-tight text-white drop-shadow-sm">{data.name}</h1>
              {data.verified ? (
                <span className="inline-flex items-center gap-1 lg:gap-[0.278vw] rounded-full bg-white/20 px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-semibold text-white backdrop-blur">
                  <Icon name="shield-done" className="size-3.5 lg:size-[0.972vw]" />
                  Verified
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-white/80">{data.metaLine}</p>
          </div>
        </div>
        {data.canManage ? <EditButton glass /> : null}
      </div>

      {/* Bottom row: glass stat chips */}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 lg:gap-[0.556vw] p-5 lg:p-[1.389vw]">
        {data.stats.map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] rounded-lg lg:rounded-[0.556vw] border border-white/20 bg-white/15 px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-white backdrop-blur"
          >
            {s.star ? <Icon name="star" className="size-3.5 lg:size-[0.972vw] text-amber-300" /> : null}
            <span className="text-sm lg:text-[0.972vw] font-bold tabular-nums">{s.value}</span>
            <span className="text-xs lg:text-[0.764vw] text-white/75">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
