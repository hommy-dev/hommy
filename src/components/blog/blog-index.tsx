"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { PostCard } from "./post-card";
import type { PostCard as PostCardData, CategoryItem } from "./types";

/**
 * Interactive blog index: centered rounded-full category pills + a search,
 * over a clean card grid. Categories route through `?category=` (server filter);
 * search filters the already-loaded posts by title on the client.
 */
export function BlogIndex({
  posts,
  categories,
  activeCategory,
}: {
  posts: PostCardData[];
  categories: CategoryItem[];
  activeCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => p.title?.toLowerCase().includes(q));
  }, [posts, query]);

  const pill =
    "rounded-full px-5 lg:px-[1.25vw] py-2.5 lg:py-[0.65vw] text-sm lg:text-[0.903vw] font-medium whitespace-nowrap transition-colors";
  const activeCls = "bg-primary/10 text-primary font-semibold ring-1 ring-primary/25";
  const inactiveCls =
    "bg-card text-muted-foreground ring-1 ring-foreground/15 hover:bg-foreground/[0.04] hover:text-foreground";

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <div>
      {/* Filter + Search */}
      <div className="flex justify-center">
        {/* Desktop */}
        <div className="hidden w-full items-center justify-center gap-[0.5vw] lg:flex lg:flex-wrap">
          {searchOpen ? (
            <div className="flex w-[34vw] items-center gap-[0.6vw] rounded-full bg-card px-[1.2vw] py-[0.6vw] text-foreground ring-1 ring-foreground/15">
              <Icon name="search" className="size-[1vw] shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles…"
                className="w-full bg-transparent text-[0.95vw] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={closeSearch}
                aria-label="Close search"
                className="grid size-[1.7vw] shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <Icon name="close" className="size-[0.95vw]" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/blog" className={cn(pill, !activeCategory ? activeCls : inactiveCls)}>
                All posts
              </Link>
              {categories.map((c) => (
                <Link
                  key={c._id}
                  href={`/blog?category=${c.slug}`}
                  className={cn(pill, activeCategory === c.slug ? activeCls : inactiveCls)}
                >
                  {c.title}
                </Link>
              ))}
              <button
                onClick={() => setSearchOpen(true)}
                className={cn(pill, inactiveCls, "flex items-center gap-[0.4vw]")}
              >
                Search
                <Icon name="search" className="size-[0.9vw]" />
              </button>
            </>
          )}
        </div>

        {/* Mobile: filter dropdown + search input */}
        <div className="relative flex w-full items-center gap-2 lg:hidden">
          <div className="relative shrink-0">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="Filter by category"
              aria-expanded={filterOpen}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-foreground ring-1 ring-foreground/15"
            >
              <Icon name="filter" className="size-5" />
            </button>
            {filterOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-lg bg-card p-1.5 ring-1 ring-foreground/10">
                <Link
                  href="/blog"
                  onClick={() => setFilterOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm",
                    !activeCategory
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  All posts
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c._id}
                    href={`/blog?category=${c.slug}`}
                    onClick={() => setFilterOpen(false)}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm",
                      activeCategory === c.slug
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    {c.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex w-full items-center gap-2 rounded-full bg-card px-4 py-2.5 ring-1 ring-foreground/15">
            <Icon name="search" className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-12 lg:mt-[4vw]">
        {filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground lg:py-[5.556vw]">
            {query ? `No articles match “${query}”.` : "No posts here yet — check back soon."}
          </p>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-[1.667vw] lg:gap-y-[3.333vw]">
            {filtered.map((post, i) => (
              <PostCard key={post._id} post={post} priority={i < 3} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
