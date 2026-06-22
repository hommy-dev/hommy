import type {
  POSTS_QUERY_RESULT,
  CATEGORIES_QUERY_RESULT,
} from "@/sanity.types";

// Single source of truth: derive the card/filter prop types from the generated
// GROQ result types (sanity.types.ts, produced by `npm run typegen` in the
// studio) so the query, the data layer, and the UI can never drift.
export type PostCard = POSTS_QUERY_RESULT[number];
export type CategoryItem = CATEGORIES_QUERY_RESULT[number];
