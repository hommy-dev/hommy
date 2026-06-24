import type { Metadata } from "next";

import { getPosts, getPostsByCategory, getCategories } from "@/lib/data/blog";
import { BlogIndex } from "@/components/blog/blog-index";

export const metadata: Metadata = {
  // `absolute` opts out of the "%s | Hommy" template — the brand is already in the title.
  title: { absolute: "The Hommy Journal — Roofing tips, costs & guides for homeowners" },
  description:
    "Practical advice on roofing, maintenance, storm damage, costs, and hiring a contractor you can trust — from the Hommy team.",
  // Consolidate the ?category= filtered views onto the canonical /blog.
  alternates: { canonical: "/blog" },
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

  return (
    <div className="mx-auto lg:max-w-[90vw] px-5 pb-24 pt-28 lg:px-[1.389vw] lg:pb-[6.667vw] lg:pt-[12vw]">
      {/* Hero — centered title only */}
      <header className="mb-10 text-center lg:mb-[3vw]">
        <h1 className="font-sebenta text-4xl font-bold leading-[1.05] tracking-tight text-foreground lg:text-[3.889vw]">
          {activeCategory ? activeCategory.title : "Roofing, minus the guesswork."}
        </h1>
      </header>

      <BlogIndex posts={allPosts} categories={allCategories} activeCategory={category} />
    </div>
  );
}
