import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export type CompletenessItem = { label: string; done: boolean; href: string };

/**
 * Owner-only nudge: a progress bar + the still-missing pieces as quick links.
 * Renders nothing once the profile is complete.
 */
export function ProfileCompleteness({ items }: { items: CompletenessItem[] }) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  if (pct >= 100) return null;
  const todo = items.filter((i) => !i.done);

  return (
    <div className="rounded-md lg:rounded-[0.61vw] border border-primary/20 bg-primary/5 p-5 lg:p-[1.389vw]">
      <div className="flex items-start justify-between gap-4 lg:gap-[1.111vw]">
        <div>
          <h2 className="text-sm lg:text-[0.972vw] font-semibold text-foreground">
            Finish your profile
          </h2>
          <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.903vw] text-muted-foreground">
            A fuller profile earns more trust and wins more jobs.
          </p>
        </div>
        <span className="shrink-0 text-2xl lg:text-[1.944vw] font-bold tabular-nums leading-none text-primary">
          {pct}%
        </span>
      </div>

      <div className="mt-3 lg:mt-[0.833vw] h-2 lg:h-[0.556vw] overflow-hidden rounded-full bg-primary/15">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 lg:mt-[1.111vw] flex flex-wrap gap-2 lg:gap-[0.556vw]">
        {todo.map((i) => (
          <Link
            key={i.label}
            href={i.href}
            className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] rounded lg:rounded-[0.4vw] border border-primary/30 bg-card px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-sm lg:text-[0.833vw] font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5"
          >
            <Icon name="plus" className="size-3.5 lg:size-[0.972vw] text-primary" />
            {i.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
