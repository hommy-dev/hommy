import type { Metadata } from "next";

import { getPosts, getPostsByCategory, getCategories } from "@/lib/data/blog";
import { CategoryFilter } from "@/components/blog/category-filter";
import { PostCard, FeaturedCard } from "@/components/blog/post-card";

export const metadata: Metadata = {
  title: "The Hommy Journal — Roofing tips, costs & guides for homeowners",
  description:
    "Practical advice on roofing, maintenance, storm damage, costs, and hiring a contractor you can trust — from the Hommy team.",
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [allCategories, allPosts] = await Promise.all([
    getCategories(),
    category ? getPostsByCategory(category) : getPosts(),
  ]);

  const activeCategory = category ? allCategories.find((c) => c.slug === category) : undefined;

  // On the unfiltered view, lead with the top (featured) post.
  const showFeatured = !category && allPosts[0]?.featured;
  const featured = showFeatured ? allPosts[0] : undefined;
  const rest = showFeatured ? allPosts.slice(1) : allPosts;

  return (
    <div className="mx-auto max-w-[90rem] lg:max-w-[90vw] px-5 pb-24 lg:pb-[6.667vw] pt-12 lg:px-[2.778vw] lg:pt-[3.333vw]">
      {/* Hero */}
      <header className="mb-10 max-w-3xl lg:max-w-[53.328vw] lg:mb-[3.889vw]">
        <p className="mb-3 lg:mb-[0.833vw] text-sm lg:text-[0.972vw] font-semibold uppercase tracking-widest text-primary">
          The Hommy Journal
        </p>
        <h1 className="font-sebenta text-4xl font-bold leading-[1.05] tracking-tight text-foreground lg:text-[4.167vw]">
          {activeCategory ? activeCategory.title : "Roofing, demystified."}
        </h1>
        <p className="mt-4 lg:mt-[1.111vw] text-lg text-muted-foreground lg:text-[1.389vw]">
          {activeCategory?.description ??
            "Straight-talking guides on roofing, maintenance, storm damage, and hiring the right pro — so you can make confident decisions about your home."}
        </p>
      </header>

      {/* Category filter */}
      <div className="mb-10 lg:mb-[3.333vw]">
        <CategoryFilter categories={allCategories} active={category} />
      </div>

      {allPosts.length === 0 ? (
        <p className="py-20 lg:py-[5.556vw] text-center text-muted-foreground">No posts here yet — check back soon.</p>
      ) : (
        <>
          {featured && (
            <div className="mb-12 lg:mb-[3.333vw]">
              <FeaturedCard post={featured} />
            </div>
          )}
          <div className="grid gap-6 lg:gap-[1.667vw] sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, i) => (
              <PostCard key={post._id} post={post} priority={i < 3} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
