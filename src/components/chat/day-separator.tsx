export function DaySeparator({ date }: { date: Date }) {
  return (
    <div className="my-4 lg:my-[1.111vw] flex items-center justify-center">
      <span className="rounded-full bg-muted px-3 lg:px-[0.833vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-medium text-muted-foreground">
        {formatDay(date)}
      </span>
    </div>
  )
}

function formatDay(d: Date): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'

  const sameYear = d.getFullYear() === today.getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}
