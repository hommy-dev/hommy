import Link from "next/link";

import { cn } from "@/lib/utils";
import type { CategoryItem } from "./types";

/** Category filter pills. Active state is driven by the `?category=` slug. */
export function CategoryFilter({
  categories,
  active,
}: {
  categories: CategoryItem[];
  active?: string;
}) {
  const pill =
    "rounded-full border px-4 lg:px-[1.111vw] py-1.5 lg:py-[0.417vw] text-sm lg:text-[0.972vw] font-medium transition-colors whitespace-nowrap";
  return (
    <nav className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]" aria-label="Filter posts by category">
      <Link
        href="/blog"
        className={cn(
          pill,
          !active
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        )}
      >
        All
      </Link>
      {categories.map((cat) => {
        const isActive = active === cat.slug;
        return (
          <Link
            key={cat._id}
            href={`/blog?category=${cat.slug}`}
            className={cn(
              pill,
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {cat.title}
          </Link>
        );
      })}
    </nav>
  );
}
