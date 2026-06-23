// URL-safe slugs from arbitrary text. Shared by SEO geography (states/cities)
// and contractor profile URLs. e.g. "Lone Star Roofing Co." → "lone-star-roofing-co".

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD') // decompose accents so the next filter drops the marks
    .replace(/[^a-z0-9\s-]/g, '') // keep only alnum / space / hyphen
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
