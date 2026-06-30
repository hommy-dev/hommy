import type { MetadataRoute } from "next";
import { SITE_INDEXABLE, absoluteUrl } from "@/lib/seo";

// Private app surfaces + token/personalized + non-content pages — never index.
const PRIVATE_PATHS = [
  "/api/",
  "/auth/",
  "/onboarding/",
  "/admin/",
  "/contractor/",
  "/homeowner/",
  "/accept/",
  "/review/",
  "/claim/",
  "/invite/",
  "/unsubscribe",
  "/sandbox",
];

// AI assistants discover + cite us through these crawlers — answer engines that
// fetch live (ChatGPT/Claude/Perplexity browse) plus the training crawlers that
// build a model's long-term memory of who Hommy is. We explicitly welcome them
// on public content so Hommy can surface in AI answers, while still excluding the
// private routes above (a bot's most-specific UA group wins, so we repeat them).
const AI_CRAWLERS = [
  "GPTBot", // OpenAI training
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT live browse (user-triggered)
  "ClaudeBot", // Anthropic training
  "anthropic-ai", // Anthropic
  "Claude-User", // Claude live browse
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity live fetch
  "Google-Extended", // Google Gemini / Vertex
  "Applebot-Extended", // Apple Intelligence
  "CCBot", // Common Crawl (feeds many models)
];

// Pre-launch: disallow all crawling. At launch, flip SITE_INDEXABLE in
// src/lib/seo.ts to allow indexing; the sitemap reference is already wired below.
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
