import { defineQuery } from "next-sanity";

// GROQ fragments — keep projections in sync with the Studio schema
// (studio-hommy/schemaTypes). `defineQuery` enables TypeGen-generated result
// types once a frontend `sanity.types.ts` is wired up.

// Cover/inline image with metadata so the frontend can use `next/image` blur
// placeholders (lqip) and correct aspect ratios (dimensions).
const IMAGE_FRAGMENT = /* groq */ `
  asset->{
    _id,
    url,
    metadata { lqip, dimensions { width, height } }
  },
  alt,
  hotspot,
  crop
`;

const AUTHOR_CARD_FRAGMENT = /* groq */ `
  author->{
    name,
    "slug": slug.current,
    role,
    image { ${IMAGE_FRAGMENT} }
  }
`;

const CATEGORY_FRAGMENT = /* groq */ `
  category->{ _id, title, "slug": slug.current }
`;

// Shared card shape for the blog index and related-post lists.
const POST_CARD_FRAGMENT = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  eyebrow,
  excerpt,
  publishedAt,
  readTime,
  featured,
  mainImage { ${IMAGE_FRAGMENT} },
  ${CATEGORY_FRAGMENT},
  ${AUTHOR_CARD_FRAGMENT}
`;

// Blog index — featured first, then newest. Used for the card grid.
export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)]
    | order(featured desc, publishedAt desc) {
    ${POST_CARD_FRAGMENT}
  }
`);

// Posts filtered to a single category (for the filter pills / category pages).
export const POSTS_BY_CATEGORY_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && category->slug.current == $categorySlug]
    | order(featured desc, publishedAt desc) {
    ${POST_CARD_FRAGMENT}
  }
`);

// Categories for the filter pills, with a count of published posts each.
export const CATEGORIES_QUERY = defineQuery(`
  *[_type == "category"] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    "postCount": count(*[_type == "post" && references(^._id) && defined(slug.current)])
  }
`);

// Single article — full body with custom blocks and link annotations expanded.
export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    eyebrow,
    excerpt,
    publishedAt,
    _updatedAt,
    readTime,
    featured,
    mainImage { ${IMAGE_FRAGMENT} },
    ${CATEGORY_FRAGMENT},
    author->{
      name,
      "slug": slug.current,
      role,
      image { ${IMAGE_FRAGMENT} }
    },
    body[]{
      ...,
      _type == "imageBlock" => {
        ...,
        asset{
          asset->{ _id, url, metadata { lqip, dimensions { width, height } } },
          hotspot,
          crop
        }
      },
      markDefs[]{
        ...,
        _type == "link" => {
          ...,
          internalLink->{ _type, "slug": slug.current }
        }
      }
    },
    seo {
      metaTitle,
      metaDescription,
      noIndex,
      ogImage { ${IMAGE_FRAGMENT} }
    },
    relatedPosts[]->{
      ${POST_CARD_FRAGMENT}
    }
  }
`);

// All published slugs — for generateStaticParams / sitemaps.
export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)]{ "slug": slug.current }
`);
