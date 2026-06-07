import Link from "next/link"
import { cn } from "@/lib/utils"

export type ChecklistItem = { label: string; done: boolean; href: string }

export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length
  const pct = Math.round((done / items.length) * 100)

  return (
    <section className="rounded-2xl lg:rounded-[1.111vw] border border-primary/15 bg-accent/50 p-5 lg:p-[1.389vw]">
      <div className="flex items-center justify-between gap-3 lg:gap-[0.833vw]">
        <div>
          <h2 className="font-sebenta text-lg lg:text-[1.25vw] font-bold tracking-tight">
            Get ready to win jobs
          </h2>
          <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-foreground/60">
            {done} of {items.length} done. Finish setup so we can start sending
            you leads.
          </p>
        </div>
        <span className="shrink-0 text-sm lg:text-[0.972vw] font-semibold tabular-nums text-foreground/55">
          {pct}%
        </span>
      </div>

      <ul className="mt-4 lg:mt-[1.111vw] divide-y divide-foreground/10">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              prefetch
              className="group flex items-center gap-3 lg:gap-[0.833vw] py-3 lg:py-[0.833vw]"
            >
              <span
                className={cn(
                  "flex size-6 lg:size-[1.667vw] shrink-0 items-center justify-center rounded-full border",
                  item.done
                    ? "border-transparent bg-secondary text-secondary-foreground"
                    : "border-foreground/25 text-transparent",
                )}
              >
                <Check />
              </span>
              <span
                className={cn(
                  "flex-1 text-sm lg:text-[0.972vw]",
                  item.done
                    ? "text-foreground/45 line-through"
                    : "font-medium text-foreground",
                )}
              >
                {item.label}
              </span>
              {!item.done && (
                <span className="text-xs lg:text-[0.833vw] font-semibold text-primary group-hover:underline">
                  Do it
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
