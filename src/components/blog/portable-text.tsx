import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "next-sanity";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SanityImage, type SanityImageValue } from "./sanity-image";
import { blockText, slugifyHeading } from "./headings";

type LinkValue = {
  linkType?: "internal" | "external";
  internalLink?: { _type?: string; slug?: string | null } | null;
  href?: string | null;
  openInNewTab?: boolean;
};

function resolveHref(value: LinkValue): string {
  if (value.linkType === "internal" && value.internalLink?.slug) {
    return value.internalLink._type === "category"
      ? `/blog?category=${value.internalLink.slug}`
      : `/blog/${value.internalLink.slug}`;
  }
  return value.href ?? "#";
}

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const IconBase = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const InfoIcon: IconType = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v4h1" />
  </IconBase>
);
const TipIcon: IconType = (props) => (
  <IconBase {...props}>
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
  </IconBase>
);
const WarningIcon: IconType = (props) => (
  <IconBase {...props}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </IconBase>
);
const SuccessIcon: IconType = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </IconBase>
);

const calloutStyles: Record<string, { wrap: string; icon: IconType }> = {
  info: { wrap: "border-info/30 bg-info-bg text-info-foreground", icon: InfoIcon },
  tip: { wrap: "border-secondary/40 bg-secondary/10 text-foreground", icon: TipIcon },
  warning: { wrap: "border-warning/30 bg-warning-bg text-warning-foreground", icon: WarningIcon },
  success: { wrap: "border-success/30 bg-success-bg text-success-foreground", icon: SuccessIcon },
};

function toEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") return `https://player.vimeo.com/video/${url.pathname.split("/").filter(Boolean)[0]}`;
    return null;
  } catch {
    return null;
  }
}

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="my-5 lg:my-[1.389vw] leading-7 lg:leading-[1.944vw] text-foreground/90">{children}</p>,
    h2: ({ children, value }) => (
      <h2
        id={slugifyHeading(blockText(value as PortableTextBlock))}
        className="mt-12 lg:mt-[3.333vw] mb-4 lg:mb-[1.111vw] scroll-mt-28 lg:scroll-mt-[7.778vw] font-sebenta text-2xl font-bold tracking-tight text-foreground lg:text-[2.083vw]"
      >
        {children}
      </h2>
    ),
    h3: ({ children, value }) => (
      <h3
        id={slugifyHeading(blockText(value as PortableTextBlock))}
        className="mt-9 lg:mt-[2.5vw] mb-3 lg:mb-[0.833vw] scroll-mt-28 lg:scroll-mt-[7.778vw] font-sebenta text-xl font-bold tracking-tight text-foreground lg:text-[1.667vw]"
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 lg:mt-[1.667vw] mb-2 lg:mb-[0.556vw] text-lg lg:text-[1.25vw] font-semibold text-foreground">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 lg:my-[1.667vw] border-l-4 border-primary/40 pl-5 lg:pl-[1.389vw] text-lg lg:text-[1.25vw] italic text-muted-foreground">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="my-5 lg:my-[1.389vw] ml-6 lg:ml-[1.667vw] list-disc space-y-2 lg:space-y-[0.556vw] text-foreground/90">{children}</ul>,
    number: ({ children }) => <ol className="my-5 lg:my-[1.389vw] ml-6 lg:ml-[1.667vw] list-decimal space-y-2 lg:space-y-[0.556vw] text-foreground/90">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-7 lg:leading-[1.944vw] pl-1 lg:pl-[0.278vw]">{children}</li>,
    number: ({ children }) => <li className="leading-7 lg:leading-[1.944vw] pl-1 lg:pl-[0.278vw]">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => <span className="underline underline-offset-2">{children}</span>,
    code: ({ children }) => (
      <code className="rounded lg:rounded-[0.324vw] bg-muted px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] font-mono text-[0.85em] text-foreground">{children}</code>
    ),
    highlight: ({ children }) => <mark className="rounded lg:rounded-[0.324vw] bg-secondary/40 px-1 lg:px-[0.278vw] text-foreground">{children}</mark>,
    link: ({ children, value }) => {
      const href = resolveHref(value as LinkValue);
      const external = (value as LinkValue).linkType === "external";
      const newTab = (value as LinkValue).openInNewTab;
      return (
        <Link
          href={href}
          target={newTab ? "_blank" : undefined}
          rel={external && newTab ? "noopener noreferrer" : undefined}
          className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
        >
          {children}
        </Link>
      );
    },
  },
  types: {
    imageBlock: ({ value }) => {
      const image = (value as { asset?: SanityImageValue; alt?: string; caption?: string }).asset;
      if (!image?.asset) return null;
      return (
        <figure className="my-8 lg:my-[2.222vw]">
          <div className="overflow-hidden rounded-xl lg:rounded-[0.926vw] border border-border bg-muted">
            <SanityImage
              value={image}
              alt={(value as { alt?: string }).alt}
              width={1200}
              className="h-auto w-full"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          {(value as { caption?: string }).caption && (
            <figcaption className="mt-2 lg:mt-[0.556vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
              {(value as { caption?: string }).caption}
            </figcaption>
          )}
        </figure>
      );
    },
    callout: ({ value }) => {
      const v = value as { tone?: string; title?: string; content?: string };
      const style = calloutStyles[v.tone ?? "info"] ?? calloutStyles.info;
      const Icon = style.icon;
      return (
        <div className={cn("my-8 lg:my-[2.222vw] flex gap-3 lg:gap-[0.833vw] rounded-xl lg:rounded-[0.926vw] border p-5 lg:p-[1.389vw]", style.wrap)}>
          <Icon className="mt-0.5 lg:mt-[0.139vw] size-5 lg:size-[1.389vw] shrink-0" />
          <div className="space-y-1 lg:space-y-[0.278vw]">
            {v.title && <p className="font-semibold">{v.title}</p>}
            {v.content && <p className="text-sm lg:text-[0.972vw] leading-6 lg:leading-[1.667vw] opacity-90">{v.content}</p>}
          </div>
        </div>
      );
    },
    pullQuote: ({ value }) => {
      const v = value as { quote?: string; attribution?: string };
      return (
        <figure className="my-10 lg:my-[2.778vw] border-y border-border py-8 lg:py-[2.222vw] text-center">
          <blockquote className="font-sebenta text-2xl font-medium leading-snug text-foreground lg:text-[2.083vw]">
            “{v.quote}”
          </blockquote>
          {v.attribution && (
            <figcaption className="mt-4 lg:mt-[1.111vw] text-sm lg:text-[0.972vw] font-medium uppercase tracking-wide text-muted-foreground">
              {v.attribution}
            </figcaption>
          )}
        </figure>
      );
    },
    cta: ({ value }) => {
      const v = value as { label?: string; variant?: "primary" | "secondary"; link?: LinkValue };
      const href = v.link ? resolveHref(v.link) : "#";
      const newTab = v.link?.openInNewTab;
      return (
        <div className="my-8 lg:my-[2.222vw] flex justify-center">
          <Button asChild size="lg" variant={v.variant === "secondary" ? "outline" : "default"}>
            <Link href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined}>
              {v.label}
            </Link>
          </Button>
        </div>
      );
    },
    embed: ({ value }) => {
      const v = value as { url?: string; caption?: string };
      const embed = v.url ? toEmbedUrl(v.url) : null;
      if (!embed) return null;
      return (
        <figure className="my-8 lg:my-[2.222vw]">
          <div className="aspect-video overflow-hidden rounded-xl lg:rounded-[0.926vw] border border-border bg-black">
            <iframe
              src={embed}
              title={v.caption ?? "Embedded video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          {v.caption && (
            <figcaption className="mt-2 lg:mt-[0.556vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">{v.caption}</figcaption>
          )}
        </figure>
      );
    },
  },
};

export function BlogPortableText({ value }: { value: PortableTextBlock[] }) {
  if (!Array.isArray(value)) return null;
  return <PortableText value={value} components={components} />;
}
