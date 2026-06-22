import { defineQuery } from "next-sanity";

// Starter queries against the placeholder `post` type. Replace as the
// content model evolves. `defineQuery` enables TypeGen-generated result types.
export const POSTS_QUERY = defineQuery(
  `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt
  }`,
);

export const POST_QUERY = defineQuery(
  `*[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    publishedAt,
    body
  }`,
);
