import type { PortableTextBlock } from "next-sanity";

export type TocHeading = { text: string; slug: string; level: 2 | 3 };

/** Plain text of a Portable Text block (concatenated span text). */
export function blockText(block: PortableTextBlock): string {
  if (!Array.isArray(block.children)) return "";
  return block.children
    .map((child) => (typeof child.text === "string" ? child.text : ""))
    .join("");
}

/** Stable, URL-safe anchor id derived from heading text. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extract h2/h3 headings from a body for the table of contents. */
export function extractHeadings(body: PortableTextBlock[] | null | undefined): TocHeading[] {
  if (!Array.isArray(body)) return [];
  const headings: TocHeading[] = [];
  for (const block of body) {
    if (block._type !== "block") continue;
    if (block.style !== "h2" && block.style !== "h3") continue;
    const text = blockText(block);
    if (!text) continue;
    headings.push({ text, slug: slugifyHeading(text), level: block.style === "h2" ? 2 : 3 });
  }
  return headings;
}
