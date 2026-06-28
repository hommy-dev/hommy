import { Skeleton } from "@/components/ui/skeleton"

// Shape-matched skeletons for the dashboard's data regions. Each mirrors the real
// component's layout (grid/rows/sizes) so the static page shell can paint
// instantly and only the data area pulses — no layout shift when data arrives.

/** Generic data-table skeleton: header row + N body rows of `cols` cells. */
export function TableSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw]">
                <Skeleton className="h-3 lg:h-[0.833vw] w-16 lg:w-[4.5vw]" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw]">
                  <Skeleton className="h-4 lg:h-[1.111vw] w-24 lg:w-[7vw]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** One job card skeleton — mirrors JobCardItem (avatar+name, title, meta rows,
 *  pipeline progress, action button). */
function JobCardSkeleton() {
  return (
    <div className="flex flex-col rounded-md lg:rounded-[0.7vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <div className="flex items-center gap-2.5 lg:gap-[0.694vw]">
        <Skeleton className="size-9 lg:size-[2.5vw] shrink-0 rounded-full" />
        <div className="space-y-1.5 lg:space-y-[0.417vw]">
          <Skeleton className="h-3.5 lg:h-[0.972vw] w-28 lg:w-[8vw]" />
          <Skeleton className="h-3 lg:h-[0.833vw] w-16 lg:w-[4.5vw]" />
        </div>
      </div>
      <Skeleton className="mt-3 lg:mt-[0.833vw] h-5 lg:h-[1.389vw] w-3/4" />
      <div className="mt-2.5 lg:mt-[0.694vw] space-y-2 lg:space-y-[0.556vw]">
        <Skeleton className="h-3.5 lg:h-[0.972vw] w-1/2" />
        <Skeleton className="h-3.5 lg:h-[0.972vw] w-2/5" />
      </div>
      <div className="mt-4 lg:mt-[1.111vw] flex gap-1 lg:gap-[0.278vw]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-1.5 lg:h-[0.417vw] flex-1 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-4 lg:mt-[1.111vw] h-9 lg:h-[2.5vw] w-full rounded-lg lg:rounded-[0.556vw]" />
    </div>
  )
}

/** Mirrors the Jobs board's DEFAULT card view: search + filter + view toggle,
 *  then a responsive card grid. */
export function JobsBoardSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-[0.556vw]">
          <Skeleton className="h-9 lg:h-[2.5vw] w-full sm:max-w-xs lg:max-w-[20vw] rounded-md lg:rounded-[0.556vw]" />
          <Skeleton className="h-9 lg:h-[2.5vw] w-24 lg:w-[7vw] shrink-0 rounded-md lg:rounded-[0.556vw]" />
        </div>
        <Skeleton className="h-9 lg:h-[2.5vw] w-24 lg:w-[7vw] shrink-0 rounded-lg lg:rounded-[0.556vw]" />
      </div>
      <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/** Homeowner jobs board: search + filter, then a grid of request cards. */
export function HomeownerJobsSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex items-center gap-2 lg:gap-[0.556vw]">
        <Skeleton className="h-9 lg:h-[2.5vw] w-full sm:max-w-xs lg:max-w-[20vw] rounded-md lg:rounded-[0.556vw]" />
        <Skeleton className="h-9 lg:h-[2.5vw] w-28 lg:w-[8vw] rounded-md lg:rounded-[0.556vw]" />
      </div>
      <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 lg:gap-[0.833vw] rounded-md lg:rounded-[0.7vw] border border-border bg-card p-5 lg:p-[1.389vw]"
          >
            <div className="flex items-center gap-2.5 lg:gap-[0.694vw]">
              <Skeleton className="size-9 lg:size-[2.5vw] rounded-full" />
              <Skeleton className="h-3.5 lg:h-[0.972vw] w-20 lg:w-[5.5vw]" />
            </div>
            <Skeleton className="h-5 lg:h-[1.389vw] w-2/3" />
            <Skeleton className="h-10 lg:h-[2.778vw] w-full rounded-md lg:rounded-[0.5vw]" />
            <Skeleton className="h-4 lg:h-[1.111vw] w-1/2" />
            <Skeleton className="mt-2 lg:mt-[0.556vw] h-9 lg:h-[2.5vw] w-full rounded-lg lg:rounded-[0.556vw]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Contacts board: search + table. */
export function ContactsTableSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <Skeleton className="h-9 lg:h-[2.5vw] w-full sm:max-w-xs lg:sm:max-w-[20vw] rounded-md lg:rounded-[0.556vw]" />
      <TableSkeleton cols={5} rows={6} />
    </div>
  )
}

/** A settings section: title + description header ABOVE a bordered card holding
 *  the body rows — mirrors `SettingsSection` exactly (card form). */
export function SettingsSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="space-y-4 lg:space-y-[1.111vw]">
      <div className="space-y-1.5 lg:space-y-[0.417vw]">
        <Skeleton className="h-5 lg:h-[1.389vw] w-40 lg:w-[13vw]" />
        <Skeleton className="h-3.5 lg:h-[0.972vw] w-64 lg:w-[22vw]" />
      </div>
      <div className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-5 lg:p-[1.389vw]">
        <SettingsRowsSkeleton rows={rows} />
      </div>
    </section>
  )
}

/** A few label/value rows inside a settings section card. */
export function SettingsRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5 lg:space-y-[0.417vw]">
          <Skeleton className="h-3 lg:h-[0.833vw] w-24 lg:w-[7vw]" />
          <Skeleton className="h-5 lg:h-[1.389vw] w-48 lg:w-[16vw]" />
        </div>
      ))}
    </div>
  )
}

/** Profile page: header band + completeness + main column sections + sidebar. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      {/* Header band */}
      <div className="flex flex-wrap items-center gap-4 lg:gap-[1.111vw] rounded-md lg:rounded-[0.8vw] border border-border bg-card p-5 lg:p-[1.389vw]">
        <Skeleton className="size-16 lg:size-[4.444vw] rounded-md lg:rounded-[0.8vw]" />
        <div className="space-y-2 lg:space-y-[0.556vw]">
          <Skeleton className="h-6 lg:h-[1.667vw] w-48 lg:w-[16vw]" />
          <Skeleton className="h-4 lg:h-[1.111vw] w-64 lg:w-[20vw]" />
        </div>
        <div className="ml-auto flex gap-6 lg:gap-[1.667vw]">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 lg:h-[2.778vw] w-12 lg:w-[4vw]" />
          ))}
        </div>
      </div>

      {/* Body: main column + sidebar */}
      <div className="grid gap-6 lg:gap-[1.667vw] lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div className="space-y-8 lg:space-y-[2.222vw]">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4 lg:space-y-[1.111vw]">
              <Skeleton className="h-6 lg:h-[1.667vw] w-32 lg:w-[10vw]" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-[0.833vw]">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="aspect-4/3 rounded-xl lg:rounded-[0.833vw]" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-64 lg:h-[22vw] rounded-md lg:rounded-[0.8vw]" />
      </div>
    </div>
  )
}

/** Sidebar account/user-menu fallback while company list loads. */
export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-2.5 lg:gap-[0.694vw] p-2 lg:p-[0.556vw]">
      <Skeleton className="size-8 lg:size-[2.222vw] shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5 lg:space-y-[0.417vw] group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-3.5 lg:h-[0.972vw] w-24 lg:w-[7vw]" />
        <Skeleton className="h-3 lg:h-[0.833vw] w-32 lg:w-[9vw]" />
      </div>
    </div>
  )
}

/** Header actions fallback (credits pill + bell) while counts load. */
export function HeaderActionsSkeleton() {
  return (
    <div className="flex items-center gap-2 lg:gap-[0.556vw]">
      <Skeleton className="h-8 lg:h-[2.222vw] w-20 lg:w-[5.5vw] rounded-full" />
      <Skeleton className="size-8 lg:size-[2.222vw] rounded-full" />
    </div>
  )
}
