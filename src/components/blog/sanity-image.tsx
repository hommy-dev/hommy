import Image from "next/image";

import { urlFor } from "@/sanity/image";
import { cn } from "@/lib/utils";

export type SanityImageValue = {
  asset?: {
    _id?: string;
    url?: string;
    metadata?: {
      lqip?: string | null;
      dimensions?: { width: number; height: number } | null;
    } | null;
  } | null;
  alt?: string | null;
  hotspot?: unknown;
  crop?: unknown;
} | null;

type SanityImageProps = {
  value: SanityImageValue | undefined;
  /** Override alt (falls back to the image's own alt). */
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Fill the parent (parent must be positioned). Use for cover/card images. */
  fill?: boolean;
  /** Fixed render width when not using `fill`. */
  width?: number;
};

/**
 * Renders a Sanity image through next/image, respecting hotspot/crop and using
 * the queried LQIP as a blur placeholder. Requires `asset->{ url, metadata }`
 * (and ideally `metadata.dimensions`) in the GROQ projection.
 */
export function SanityImage({
  value,
  alt,
  className,
  sizes,
  priority,
  fill,
  width = 1200,
}: SanityImageProps) {
  if (!value?.asset) return null;

  const lqip = value.asset.metadata?.lqip ?? undefined;
  const blur = lqip ? { placeholder: "blur" as const, blurDataURL: lqip } : {};
  const resolvedAlt = alt ?? value.alt ?? "";

  if (fill) {
    return (
      <Image
        src={urlFor(value).width(1600).fit("crop").auto("format").url()}
        alt={resolvedAlt}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
        className={cn("object-cover", className)}
        {...blur}
      />
    );
  }

  const dims = value.asset.metadata?.dimensions;
  const ratio = dims && dims.width && dims.height ? dims.height / dims.width : 2 / 3;
  const height = Math.round(width * ratio);

  return (
    <Image
      src={urlFor(value).width(width).auto("format").url()}
      alt={resolvedAlt}
      width={width}
      height={height}
      sizes={sizes ?? "(max-width: 768px) 100vw, 768px"}
      priority={priority}
      className={className}
      {...blur}
    />
  );
}
