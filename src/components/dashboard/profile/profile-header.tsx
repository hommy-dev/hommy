import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type ProfileStat = {
  label: string;
  value: string;
  star?: boolean;
  accent?: boolean;
  href?: string;
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/**
 * The clean, bannerless profile hero: a single bordered card with a thin brand
 * accent strip, the company identity, an Edit action, and an inline trust-stat row.
 */
export function ProfileHeader({
  name,
  verified,
  logoUrl,
  metaLine,
  stats,
  canManage,
  editHref,
}: {
  name: string;
  verified: boolean;
  logoUrl: string | null;
  metaLine: string;
  stats: ProfileStat[];
  canManage: boolean;
  editHref: string;
}) {
  return (
    <div className="gradient-frame rounded-xl lg:rounded-[0.8vw]">
      <div className="p-6 lg:p-[1.667vw]">
        <div className="flex flex-col gap-4 lg:gap-[1.111vw] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 lg:gap-[1.111vw]">
            <span className="relative flex size-16 lg:size-[5vw] shrink-0 items-center justify-center rounded-full border bg-muted text-lg lg:text-[1.5vw] font-semibold text-foreground/70">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
              ) : (
                initials(name)
              )}
              {verified ? (
                <span className=" absolute bottom-1 -right-1 lg:bottom-[0.278vw] lg:-right-[0.278vw] w-fit h-fit bg-background rounded-full size-5 lg:size-[1.39vw] ">
                  <Icon
                    name="badge-check"
                    className="size-5 lg:size-[1.39vw] flex items-center justify-center rounded-full text-primary"
                  />
                </span>
              ) : null}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
                <h1 className="font-sebenta text-base lg:text-[1.667vw] font-bold tracking-tight">
                  {name}
                </h1>
                {verified ? (
                  <span className="inline-flex items-center gap-1 lg:gap-[0.278vw] rounded-full bg-secondary px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-semibold text-secondary-foreground">
                    <Icon
                      name="shield-done"
                      className="size-3.5 lg:size-[0.972vw]"
                    />
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
                {metaLine}
              </p>
            </div>
          </div>

          {canManage ? (
            <Link
              href={editHref}
              className="inline-flex shrink-0 items-center gap-1.5 lg:gap-[0.417vw] rounded lg:rounded-[0.5vw] border border-border bg-card px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              <Icon name="edit" className="size-4 lg:size-[1.111vw]" />
              Edit profile
            </Link>
          ) : null}
        </div>

        <div className="mt-5 lg:mt-[1.389vw] flex flex-wrap items-center gap-x-6 lg:gap-x-[1.667vw] gap-y-2 lg:gap-y-[0.556vw] border-t border-border pt-5 lg:pt-[1.389vw] text-sm lg:text-[0.972vw]">
          {stats.map((s) => {
            const inner = (
              <>
                {s.star ? (
                  <Icon
                    name="star"
                    className="size-4 lg:size-[1.111vw] text-amber-400"
                  />
                ) : null}
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    s.accent ? "text-primary" : "text-foreground"
                  )}
                >
                  {s.value}
                </span>
                <span className="text-muted-foreground">{s.label}</span>
              </>
            );
            return s.href ? (
              <Link
                key={s.label}
                href={s.href}
                prefetch
                className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] transition-opacity hover:opacity-70"
              >
                {inner}
              </Link>
            ) : (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 lg:gap-[0.417vw]"
              >
                {inner}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
